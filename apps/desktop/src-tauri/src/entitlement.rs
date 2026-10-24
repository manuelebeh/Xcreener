//! Verifies the plan token signed by the API (`GET /v1/me/entitlement`).
//!
//! Paid features read the plan from here, never from SQLite settings: a token can only be
//! produced with the API's private key, so editing local data cannot grant a paid plan.

use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine};
use ring::signature::{UnparsedPublicKey, ED25519};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

/// Raw Ed25519 public key (base64url), baked in at build time. Without it every token is rejected.
const PUBLIC_KEY: Option<&str> = option_env!("SNAPGLOW_ENTITLEMENT_PUBLIC_KEY");

/// Tolerated drift between the API clock and this machine.
const CLOCK_SKEW_SECONDS: u64 = 300;

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Entitlement {
    pub plan: String,
    /// Unix seconds.
    pub expires_at: u64,
}

#[derive(Deserialize)]
struct Header {
    alg: String,
}

#[derive(Deserialize)]
struct Claims {
    sub: String,
    plan: String,
    iat: u64,
    exp: u64,
}

fn decode_json<T: for<'de> Deserialize<'de>>(segment: &str) -> Option<T> {
    serde_json::from_slice(&URL_SAFE_NO_PAD.decode(segment).ok()?).ok()
}

/// Checks the EdDSA signature, that the token was issued to `user_id` (the id the API
/// returned with it), then the validity window. Any failure means "free".
pub fn verify(token: &str, user_id: &str, public_key: &[u8], now: u64) -> Option<Entitlement> {
    let mut parts = token.split('.');
    let (header_b64, claims_b64, signature_b64) = (parts.next()?, parts.next()?, parts.next()?);
    if parts.next().is_some() {
        return None;
    }

    let header: Header = decode_json(header_b64)?;
    if header.alg != "EdDSA" {
        return None;
    }

    let signature = URL_SAFE_NO_PAD.decode(signature_b64).ok()?;
    let signed = &token[..header_b64.len() + 1 + claims_b64.len()];
    UnparsedPublicKey::new(&ED25519, public_key)
        .verify(signed.as_bytes(), &signature)
        .ok()?;

    let claims: Claims = decode_json(claims_b64)?;
    if claims.sub != user_id {
        return None;
    }
    if claims.exp <= now || claims.iat > now + CLOCK_SKEW_SECONDS {
        return None;
    }
    if !matches!(claims.plan.as_str(), "free" | "team_starter" | "team_pro") {
        return None;
    }

    Some(Entitlement {
        plan: claims.plan,
        expires_at: claims.exp,
    })
}

/// Verifies with the build-time public key and the current clock.
pub fn verify_now(token: &str, user_id: &str) -> Option<Entitlement> {
    let public_key = URL_SAFE_NO_PAD.decode(PUBLIC_KEY?).ok()?;
    let now = SystemTime::now().duration_since(UNIX_EPOCH).ok()?.as_secs();
    verify(token, user_id, &public_key, now)
}

#[cfg(test)]
mod tests {
    use super::*;
    use ring::rand::SystemRandom;
    use ring::signature::{Ed25519KeyPair, KeyPair};

    const NOW: u64 = 1_800_000_000;

    fn key_pair() -> Ed25519KeyPair {
        let pkcs8 = Ed25519KeyPair::generate_pkcs8(&SystemRandom::new()).unwrap();
        Ed25519KeyPair::from_pkcs8(pkcs8.as_ref()).unwrap()
    }

    fn token(keys: &Ed25519KeyPair, alg: &str, plan: &str, iat: u64, exp: u64) -> String {
        let header = URL_SAFE_NO_PAD.encode(format!(r#"{{"alg":"{alg}"}}"#));
        let claims = URL_SAFE_NO_PAD.encode(format!(
            r#"{{"sub":"user-1","plan":"{plan}","iat":{iat},"exp":{exp}}}"#
        ));
        let signed = format!("{header}.{claims}");
        let signature = URL_SAFE_NO_PAD.encode(keys.sign(signed.as_bytes()));
        format!("{signed}.{signature}")
    }

    #[test]
    fn accepts_a_valid_token() {
        let keys = key_pair();
        let jwt = token(&keys, "EdDSA", "team_pro", NOW - 10, NOW + 3600);
        assert_eq!(
            verify(&jwt, "user-1", keys.public_key().as_ref(), NOW),
            Some(Entitlement {
                plan: "team_pro".into(),
                expires_at: NOW + 3600
            })
        );
    }

    #[test]
    fn rejects_tampered_claims() {
        let keys = key_pair();
        let jwt = token(&keys, "EdDSA", "free", NOW - 10, NOW + 3600);
        let mut parts: Vec<&str> = jwt.split('.').collect();
        let forged = URL_SAFE_NO_PAD.encode(format!(
            r#"{{"sub":"user-1","plan":"team_pro","iat":{},"exp":{}}}"#,
            NOW - 10,
            NOW + 3600
        ));
        parts[1] = &forged;
        assert_eq!(
            verify(&parts.join("."), "user-1", keys.public_key().as_ref(), NOW),
            None
        );
    }

    #[test]
    fn rejects_a_token_issued_to_another_user() {
        let keys = key_pair();
        let jwt = token(&keys, "EdDSA", "team_pro", NOW - 10, NOW + 3600);
        assert_eq!(verify(&jwt, "user-2", keys.public_key().as_ref(), NOW), None);
    }

    #[test]
    fn rejects_another_key() {
        let jwt = token(&key_pair(), "EdDSA", "team_pro", NOW - 10, NOW + 3600);
        assert_eq!(verify(&jwt, "user-1", key_pair().public_key().as_ref(), NOW), None);
    }

    #[test]
    fn rejects_other_algorithms() {
        let keys = key_pair();
        let jwt = token(&keys, "HS256", "team_pro", NOW - 10, NOW + 3600);
        assert_eq!(verify(&jwt, "user-1", keys.public_key().as_ref(), NOW), None);
    }

    #[test]
    fn rejects_expired_tokens() {
        let keys = key_pair();
        let jwt = token(&keys, "EdDSA", "team_pro", NOW - 7200, NOW - 1);
        assert_eq!(verify(&jwt, "user-1", keys.public_key().as_ref(), NOW), None);
    }

    #[test]
    fn rejects_tokens_issued_in_the_future() {
        let keys = key_pair();
        let jwt = token(&keys, "EdDSA", "team_pro", NOW + 3600, NOW + 7200);
        assert_eq!(verify(&jwt, "user-1", keys.public_key().as_ref(), NOW), None);
    }

    /// Token and key produced by `jose` exactly like apps/api/src/services/entitlement.ts.
    #[test]
    fn accepts_a_token_signed_by_the_api_library() {
        let public_key = URL_SAFE_NO_PAD
            .decode("XcsqXF79sE-at8ZqsBudMIQSnOQbjYy15FqWoIwOEoo")
            .unwrap();
        let jwt = "eyJhbGciOiJFZERTQSJ9.eyJwbGFuIjoidGVhbV9zdGFydGVyIiwic3ViIjoidXNlci0xIiwiaWF0IjoxNzk5OTk5OTkwLCJleHAiOjE4MDAwMDM2MDB9.CJS6QuQ7sujkxOqd3w34rid6hqbQxm56PnYRtCUqPQuWgLkD31YQngWNo4Cv2HH5Zrz7TP9QdQ26f_CjV0-1Cg";
        assert_eq!(
            verify(jwt, "user-1", &public_key, NOW),
            Some(Entitlement {
                plan: "team_starter".into(),
                expires_at: NOW + 3600
            })
        );
    }

    #[test]
    fn rejects_malformed_tokens() {
        let keys = key_pair();
        assert_eq!(verify("not-a-token", "user-1", keys.public_key().as_ref(), NOW), None);
        assert_eq!(verify("a.b.c.d", "user-1", keys.public_key().as_ref(), NOW), None);
    }
}
