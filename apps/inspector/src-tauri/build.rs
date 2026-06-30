fn main() {
    // On macOS we need to embed the Info.plist directly into the dev binary so
    // that CoreBluetooth can read NSBluetoothAlwaysUsageDescription without us
    // having to ship a full .app bundle just to run `tauri dev`.
    #[cfg(target_os = "macos")]
    {
        println!("cargo:rerun-if-changed=Info.plist");
        println!("cargo:rustc-link-arg=-Wl,-sectcreate,__TEXT,__info_plist,Info.plist");
    }
    tauri_build::build()
}
