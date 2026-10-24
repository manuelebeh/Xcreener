use crate::entitlement::{verify_now, Entitlement};

/// Returns the verified plan, or `None` when the token is missing, forged, expired or
/// issued to another user than `user_id`.
#[tauri::command]
pub fn verify_entitlement(token: String, user_id: String) -> Option<Entitlement> {
    verify_now(&token, &user_id)
}
