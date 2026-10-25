//! Auth0 session for the cloud features. Rust runs the PKCE login, the code exchange and the
//! refresh, and keeps the token set in the keychain. The WebView only receives the access
//! token, so a script running there cannot take the refresh token to another machine.

use std::sync::{Mutex, MutexGuard};
use std::time::{Duration, SystemTime, UNIX_EPOCH};

use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use base64::Engine;
use ring::digest::{digest, SHA256};
use ring::rand::{SecureRandom, SystemRandom};
use serde::{Deserialize, Serialize};
use serde_json::json;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

use crate::secure_store;

// Same values as the WebView's VITE_AUTH0_*, baked in by build.rs so the WebView cannot
// point the token requests at another host.
const DOMAIN: Option<&str> = option_env!("XCREENER_AUTH0_DOMAIN");
const CLIENT_ID: Option<&str> = option_env!("XCREENER_AUTH0_CLIENT_ID");
const AUDIENCE: Option<&str> = option_env!("XCREENER_AUTH0_AUDIENCE");

const REDIRECT_URI: &str = "xcreener://auth/callback";
const SECRET_NAME: &str = "cloud.tokens";
/// Refresh this long before expiry so the token is still valid when the WebView uses it.
const REFRESH_MARGIN_MS: i64 = 30_000;

struct Config {
    domain: &'static str,
    client_id: &'static str,
    audience: &'static str,
}

fn config() -> Result<Config, String> {
    let value = |value: Option<&'static str>| value.filter(|value| !value.is_empty());
    match (value(DOMAIN), value(CLIENT_ID), value(AUDIENCE)) {
        (Some(domain), Some(client_id), Some(audience)) => Ok(Config {
            domain,
            client_id,
            audience,
        }),
        _ => Err("Cloud sign-in is not configured in this build".into()),
    }
}

/// Keychain format shared with the earlier WebView implementation, so sessions survive updates.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Tokens {
    access_token: String,
    refresh_token: Option<String>,
    /// Unix time in milliseconds.
    expires_at: Option<i64>,
}

#[derive(Deserialize)]
struct TokenResponse {
    access_token: String,
    refresh_token: Option<String>,
    expires_in: Option<i64>,
}

#[derive(Deserialize)]
struct OAuthError {
    error: String,
}

enum TokenError {
    /// Auth0 answered with an OAuth error code, e.g. `invalid_grant`.
    Rejected(String),
    Failed(String),
}

impl TokenError {
    fn detail(&self) -> &str {
        match self {
            TokenError::Rejected(detail) | TokenError::Failed(detail) => detail,
        }
    }
}

struct PendingLogin {
    code_verifier: String,
    state: String,
}

#[derive(Default)]
pub struct CloudAuth {
    pending: Mutex<Option<PendingLogin>>,
    /// Held across load, refresh and save so two callers never spend the same refresh token
    /// (Auth0 rotation treats that as reuse and revokes the session).
    session: tauri::async_runtime::Mutex<()>,
}

fn lock<T>(mutex: &Mutex<T>) -> MutexGuard<'_, T> {
    mutex.lock().unwrap_or_else(|error| error.into_inner())
}

fn now_ms() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|elapsed| elapsed.as_millis() as i64)
        .unwrap_or(0)
}

fn random_token(bytes: usize) -> Result<String, String> {
    let mut buffer = vec![0u8; bytes];
    SystemRandom::new()
        .fill(&mut buffer)
        .map_err(|_| "Could not generate random bytes".to_string())?;
    Ok(URL_SAFE_NO_PAD.encode(buffer))
}

fn code_challenge(code_verifier: &str) -> String {
    URL_SAFE_NO_PAD.encode(digest(&SHA256, code_verifier.as_bytes()))
}

fn authorize_url(
    config: &Config,
    code_challenge: &str,
    state: &str,
    organization: Option<&str>,
) -> Result<String, String> {
    let mut url = url::Url::parse_with_params(
        &format!("https://{}/authorize", config.domain),
        [
            ("response_type", "code"),
            ("client_id", config.client_id),
            ("redirect_uri", REDIRECT_URI),
            ("scope", "openid profile email offline_access"),
            ("audience", config.audience),
            ("code_challenge", code_challenge),
            ("code_challenge_method", "S256"),
            ("state", state),
        ],
    )
    .map_err(|error| error.to_string())?;
    if let Some(organization) = organization.filter(|value| !value.is_empty()) {
        url.query_pairs_mut()
            .append_pair("organization", organization);
    }
    Ok(url.into())
}

/// Returns the authorization code when `url` answers the pending login.
fn callback_code(url: &str, pending: Option<&PendingLogin>) -> Result<String, String> {
    let url = url::Url::parse(url).map_err(|_| "Invalid Auth0 callback".to_string())?;
    let param = |name: &str| {
        url.query_pairs()
            .find(|(key, _)| key == name)
            .map(|(_, value)| value.into_owned())
    };
    if let Some(error) = param("error") {
        return Err(param("error_description").unwrap_or(error));
    }
    match (param("code"), param("state"), pending) {
        (Some(code), Some(state), Some(pending)) if pending.state == state => Ok(code),
        _ => Err("Invalid Auth0 callback".into()),
    }
}

fn needs_refresh(tokens: &Tokens, now_ms: i64) -> bool {
    tokens
        .expires_at
        .is_some_and(|expires_at| expires_at <= now_ms + REFRESH_MARGIN_MS)
}

fn tokens_from_response(
    response: TokenResponse,
    previous_refresh_token: Option<String>,
    now_ms: i64,
) -> Tokens {
    Tokens {
        access_token: response.access_token,
        refresh_token: response.refresh_token.or(previous_refresh_token),
        expires_at: response.expires_in.map(|seconds| now_ms + seconds * 1000),
    }
}

async fn request_tokens(
    config: &Config,
    body: serde_json::Value,
) -> Result<TokenResponse, TokenError> {
    // reqwest is built without a default rustls provider (same setup as the updater plugin).
    if rustls::crypto::CryptoProvider::get_default().is_none() {
        let _ = rustls::crypto::ring::default_provider().install_default();
    }
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .map_err(|error| TokenError::Failed(error.to_string()))?;
    let response = client
        .post(format!("https://{}/oauth/token", config.domain))
        .json(&body)
        .send()
        .await
        .map_err(|error| TokenError::Failed(error.to_string()))?;

    let status = response.status();
    if status.is_success() {
        return response
            .json()
            .await
            .map_err(|error| TokenError::Failed(error.to_string()));
    }
    match response.json::<OAuthError>().await {
        Ok(payload) => Err(TokenError::Rejected(payload.error)),
        Err(_) => Err(TokenError::Failed(status.to_string())),
    }
}

async fn keychain<T: Send + 'static>(
    task: impl FnOnce() -> Result<T, String> + Send + 'static,
) -> Result<T, String> {
    tauri::async_runtime::spawn_blocking(task)
        .await
        .map_err(|error| error.to_string())?
}

async fn save(tokens: &Tokens) -> Result<(), String> {
    let raw = serde_json::to_string(tokens).map_err(|error| error.to_string())?;
    keychain(move || secure_store::set(SECRET_NAME, &raw)).await
}

async fn load() -> Result<Option<Tokens>, String> {
    let Some(raw) = keychain(|| secure_store::get(SECRET_NAME)).await? else {
        return Ok(None);
    };
    Ok(serde_json::from_str(&raw).ok())
}

async fn clear() -> Result<(), String> {
    keychain(|| secure_store::delete(SECRET_NAME)).await
}

#[tauri::command]
pub async fn cloud_auth_start(
    app: AppHandle,
    auth: State<'_, CloudAuth>,
    organization: Option<String>,
) -> Result<(), String> {
    let config = config()?;
    let code_verifier = random_token(32)?;
    let state = random_token(16)?;
    let url = authorize_url(
        &config,
        &code_challenge(&code_verifier),
        &state,
        organization.as_deref(),
    )?;
    *lock(&auth.pending) = Some(PendingLogin {
        code_verifier,
        state,
    });
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn cloud_auth_complete(auth: State<'_, CloudAuth>, url: String) -> Result<(), String> {
    let config = config()?;
    let (code, code_verifier) = {
        let mut pending = lock(&auth.pending);
        let code = callback_code(&url, pending.as_ref())?;
        let login = pending.take().ok_or("Invalid Auth0 callback")?;
        (code, login.code_verifier)
    };

    let _session = auth.session.lock().await;
    let response = request_tokens(
        &config,
        json!({
            "grant_type": "authorization_code",
            "client_id": config.client_id,
            "code": code,
            "code_verifier": code_verifier,
            "redirect_uri": REDIRECT_URI,
        }),
    )
    .await
    .map_err(|error| {
        format!(
            "Failed to exchange Auth0 authorization code: {}",
            error.detail()
        )
    })?;
    save(&tokens_from_response(response, None, now_ms())).await
}

/// A valid access token for the API, refreshed first when it is about to expire. `None` when
/// signed out or when Auth0 no longer accepts the refresh token.
#[tauri::command]
pub async fn cloud_access_token(auth: State<'_, CloudAuth>) -> Result<Option<String>, String> {
    let _session = auth.session.lock().await;
    let Some(tokens) = load().await? else {
        return Ok(None);
    };
    if !needs_refresh(&tokens, now_ms()) {
        return Ok(Some(tokens.access_token));
    }
    let Some(refresh_token) = tokens.refresh_token else {
        clear().await?;
        return Ok(None);
    };

    let config = config()?;
    let result = request_tokens(
        &config,
        json!({
            "grant_type": "refresh_token",
            "client_id": config.client_id,
            "refresh_token": refresh_token,
        }),
    )
    .await;
    match result {
        Ok(response) => {
            let refreshed = tokens_from_response(response, Some(refresh_token), now_ms());
            save(&refreshed).await?;
            Ok(Some(refreshed.access_token))
        }
        Err(TokenError::Rejected(code)) if code == "invalid_grant" => {
            clear().await?;
            Ok(None)
        }
        Err(error) => Err(format!(
            "Failed to refresh Auth0 session: {}",
            error.detail()
        )),
    }
}

#[tauri::command]
pub async fn cloud_sign_out(auth: State<'_, CloudAuth>) -> Result<(), String> {
    *lock(&auth.pending) = None;
    let _session = auth.session.lock().await;
    clear().await
}

#[cfg(test)]
mod tests {
    use super::*;

    fn test_config() -> Config {
        Config {
            domain: "tenant.eu.auth0.com",
            client_id: "client",
            audience: "https://api.xcreener.app",
        }
    }

    fn pending(state: &str) -> PendingLogin {
        PendingLogin {
            code_verifier: "verifier".into(),
            state: state.into(),
        }
    }

    #[test]
    fn code_challenge_matches_rfc_7636_vector() {
        assert_eq!(
            code_challenge("dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk"),
            "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"
        );
    }

    #[test]
    fn verifier_has_a_valid_pkce_length() {
        let verifier = random_token(32).unwrap();
        assert!((43..=128).contains(&verifier.len()));
        assert_ne!(verifier, random_token(32).unwrap());
    }

    #[test]
    fn authorize_url_targets_the_configured_tenant() {
        let url = authorize_url(&test_config(), "challenge", "state-1", Some("org_1")).unwrap();
        let parsed = url::Url::parse(&url).unwrap();
        assert_eq!(parsed.host_str(), Some("tenant.eu.auth0.com"));
        assert_eq!(parsed.path(), "/authorize");
        let pairs: Vec<(String, String)> = parsed.query_pairs().into_owned().collect();
        assert!(pairs.contains(&("redirect_uri".into(), REDIRECT_URI.into())));
        assert!(pairs.contains(&("code_challenge_method".into(), "S256".into())));
        assert!(pairs.contains(&("organization".into(), "org_1".into())));

        let without_org = authorize_url(&test_config(), "challenge", "state-1", None).unwrap();
        assert!(!without_org.contains("organization"));
    }

    #[test]
    fn callback_requires_the_pending_state() {
        let url = "xcreener://auth/callback?code=abc&state=s1";
        assert_eq!(callback_code(url, Some(&pending("s1"))).unwrap(), "abc");
        assert!(callback_code(url, Some(&pending("other"))).is_err());
        assert!(callback_code(url, None).is_err());
        assert!(callback_code("xcreener://auth/callback?state=s1", Some(&pending("s1"))).is_err());
    }

    #[test]
    fn callback_surfaces_the_auth0_error() {
        let url = "xcreener://auth/callback?error=access_denied&error_description=Nope";
        assert_eq!(
            callback_code(url, Some(&pending("s1"))).unwrap_err(),
            "Nope"
        );
        let bare = "xcreener://auth/callback?error=access_denied";
        assert_eq!(callback_code(bare, None).unwrap_err(), "access_denied");
    }

    #[test]
    fn refreshes_within_the_margin() {
        let tokens = |expires_at| Tokens {
            access_token: "a".into(),
            refresh_token: None,
            expires_at,
        };
        assert!(!needs_refresh(&tokens(None), 1_000));
        assert!(!needs_refresh(
            &tokens(Some(1_000 + REFRESH_MARGIN_MS + 1)),
            1_000
        ));
        assert!(needs_refresh(
            &tokens(Some(1_000 + REFRESH_MARGIN_MS)),
            1_000
        ));
        assert!(needs_refresh(&tokens(Some(0)), 1_000));
    }

    #[test]
    fn refresh_keeps_the_previous_token_when_auth0_does_not_rotate() {
        let response = TokenResponse {
            access_token: "new".into(),
            refresh_token: None,
            expires_in: Some(60),
        };
        let tokens = tokens_from_response(response, Some("old".into()), 1_000);
        assert_eq!(tokens.refresh_token.as_deref(), Some("old"));
        assert_eq!(tokens.expires_at, Some(61_000));

        let rotated = TokenResponse {
            access_token: "new".into(),
            refresh_token: Some("rotated".into()),
            expires_in: None,
        };
        let tokens = tokens_from_response(rotated, Some("old".into()), 1_000);
        assert_eq!(tokens.refresh_token.as_deref(), Some("rotated"));
        assert_eq!(tokens.expires_at, None);
    }

    #[test]
    fn reads_tokens_written_by_the_webview() {
        let raw = r#"{"accessToken":"a","refreshToken":"r","expiresAt":1767225600000}"#;
        let tokens: Tokens = serde_json::from_str(raw).unwrap();
        assert_eq!(
            tokens,
            Tokens {
                access_token: "a".into(),
                refresh_token: Some("r".into()),
                expires_at: Some(1_767_225_600_000),
            }
        );
        let signed_out: Tokens =
            serde_json::from_str(r#"{"accessToken":"a","refreshToken":null,"expiresAt":null}"#)
                .unwrap();
        assert_eq!(signed_out.refresh_token, None);
    }
}
