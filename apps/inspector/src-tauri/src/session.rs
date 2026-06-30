//! Session file IO. Paths are chosen by the frontend via
//! `tauri-plugin-dialog`; these commands just do the raw read/write.

use std::path::PathBuf;

#[tauri::command]
pub async fn session_save(path: String, content: String) -> Result<(), String> {
    std::fs::write(PathBuf::from(&path), content).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn session_open(path: String) -> Result<String, String> {
    std::fs::read_to_string(PathBuf::from(&path)).map_err(|e| e.to_string())
}
