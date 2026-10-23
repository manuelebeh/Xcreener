use crate::entitlement::{verify_now, Entitlement};

/// Returns the verified plan, or `None` when the token is missing, forged or expired.
#[tauri::command]
pub fn verify_entitlement(token: String) -> Option<Entitlement> {
    verify_now(&token)
}
