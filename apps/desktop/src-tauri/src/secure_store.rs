//! OS keychain storage for secrets (Auth0 and integration tokens).
//!
//! Values are split into chunks because Windows Credential Manager caps a credential at
//! 2560 bytes and an Auth0 token set can exceed that. `<name>` holds the chunk count and
//! `<name>.<i>` the chunks.

use keyring::Entry;

const SERVICE: &str = "app.xcreener.desktop";
const CHUNK_BYTES: usize = 1000;
const MAX_CHUNKS: usize = 64;

/// The only names the WebView may touch. Any other keychain entry stays out of reach, including
/// `cloud.tokens`, which only `cloud_auth` reads.
const ALLOWED_NAMES: &[&str] = &["integrations.tokens"];

fn validate_name(name: &str) -> Result<(), String> {
    if ALLOWED_NAMES.contains(&name) {
        Ok(())
    } else {
        Err("Invalid secret name".into())
    }
}

fn split_chunks(value: &str) -> Vec<String> {
    let mut chunks = Vec::new();
    let mut current = String::new();
    for ch in value.chars() {
        if current.len() + ch.len_utf8() > CHUNK_BYTES {
            chunks.push(std::mem::take(&mut current));
        }
        current.push(ch);
    }
    if !current.is_empty() {
        chunks.push(current);
    }
    chunks
}

fn entry(name: &str) -> Result<Entry, String> {
    Entry::new(SERVICE, name).map_err(|error| error.to_string())
}

fn chunk_entry(name: &str, index: usize) -> Result<Entry, String> {
    entry(&format!("{name}.{index}"))
}

fn read_optional(entry: &Entry) -> Result<Option<String>, String> {
    match entry.get_password() {
        Ok(value) => Ok(Some(value)),
        Err(keyring::Error::NoEntry) => Ok(None),
        Err(error) => Err(error.to_string()),
    }
}

fn delete_optional(entry: &Entry) -> Result<(), String> {
    match entry.delete_credential() {
        Ok(()) | Err(keyring::Error::NoEntry) => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

pub(crate) fn get(name: &str) -> Result<Option<String>, String> {
    let Some(count) = read_optional(&entry(name)?)? else {
        return Ok(None);
    };
    let count: usize = count.parse().map_err(|_| "Corrupted secret".to_string())?;
    if count > MAX_CHUNKS {
        return Err("Corrupted secret".into());
    }
    let mut value = String::new();
    for index in 0..count {
        let chunk = read_optional(&chunk_entry(name, index)?)?
            .ok_or_else(|| "Corrupted secret".to_string())?;
        value.push_str(&chunk);
    }
    Ok(Some(value))
}

pub(crate) fn delete(name: &str) -> Result<(), String> {
    let count = read_optional(&entry(name)?)?
        .and_then(|raw| raw.parse::<usize>().ok())
        .unwrap_or(0)
        .min(MAX_CHUNKS);
    for index in 0..count {
        delete_optional(&chunk_entry(name, index)?)?;
    }
    delete_optional(&entry(name)?)
}

pub(crate) fn set(name: &str, value: &str) -> Result<(), String> {
    let chunks = split_chunks(value);
    if chunks.len() > MAX_CHUNKS {
        return Err("Secret too large".into());
    }
    delete(name)?;
    for (index, chunk) in chunks.iter().enumerate() {
        chunk_entry(name, index)?
            .set_password(chunk)
            .map_err(|error| error.to_string())?;
    }
    entry(name)?
        .set_password(&chunks.len().to_string())
        .map_err(|error| error.to_string())
}

#[tauri::command]
pub async fn secure_store_get(name: String) -> Result<Option<String>, String> {
    tauri::async_runtime::spawn_blocking(move || {
        validate_name(&name)?;
        get(&name)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn secure_store_set(name: String, value: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        validate_name(&name)?;
        set(&name, &value)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[tauri::command]
pub async fn secure_store_delete(name: String) -> Result<(), String> {
    tauri::async_runtime::spawn_blocking(move || {
        validate_name(&name)?;
        delete(&name)
    })
    .await
    .map_err(|error| error.to_string())?
}

#[cfg(test)]
mod tests {
    use super::{delete, get, set, split_chunks, validate_name, CHUNK_BYTES};

    #[test]
    fn chunks_reassemble_and_respect_the_size_cap() {
        let value = format!("{}é{}", "a".repeat(CHUNK_BYTES - 1), "日".repeat(700));
        let chunks = split_chunks(&value);

        assert!(chunks.len() > 1);
        assert!(chunks.iter().all(|chunk| chunk.len() <= CHUNK_BYTES));
        assert_eq!(chunks.concat(), value);
        assert!(split_chunks("").is_empty());
    }

    #[test]
    fn accepts_only_allowlisted_names() {
        assert!(validate_name("integrations.tokens").is_ok());
        assert!(validate_name("cloud.tokens").is_err());
        assert!(validate_name("").is_err());
        assert!(validate_name("../etc").is_err());
        assert!(validate_name("cloud.tokens.0").is_err());
        assert!(validate_name("other-app.password").is_err());
    }

    /// Touches the real OS keychain: `cargo test -- --ignored keychain_roundtrip`.
    #[test]
    #[ignore]
    fn keychain_roundtrip() {
        let name = "xcreener-test.roundtrip";
        let value = "t".repeat(CHUNK_BYTES * 3 + 17);

        set(name, &value).unwrap();
        assert_eq!(get(name).unwrap().as_deref(), Some(value.as_str()));
        set(name, "short").unwrap();
        assert_eq!(get(name).unwrap().as_deref(), Some("short"));
        delete(name).unwrap();
        assert_eq!(get(name).unwrap(), None);
    }
}
