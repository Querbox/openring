mod ble;
mod session;

use serde::Serialize;

#[derive(Serialize)]
struct AppInfo {
    name: &'static str,
    version: &'static str,
}

#[tauri::command]
fn app_info() -> AppInfo {
    AppInfo {
        name: "OpenRing Inspector",
        version: env!("CARGO_PKG_VERSION"),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(ble::BleState::new())
        .invoke_handler(tauri::generate_handler![
            app_info,
            ble::ble_start_scan,
            ble::ble_stop_scan,
            ble::ble_connect,
            ble::ble_disconnect,
            ble::ble_discover_services,
            ble::ble_subscribe,
            ble::ble_unsubscribe,
            ble::ble_write,
            session::session_save,
            session::session_open,
        ])
        .run(tauri::generate_context!())
        .expect("error while running OpenRing Inspector");
}
