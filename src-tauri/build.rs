const COMMANDS: &[&str] = &[
    "read_file_as_bytes",
    "get_pending_files",
    "open_pdf_with_system",
    "save_file_with_dialog",
    "print_message",
];

fn main() {
    // An app manifest makes Tauri enforce capabilities for our own commands too.
    tauri_build::try_build(
        tauri_build::Attributes::new()
            .app_manifest(tauri_build::AppManifest::new().commands(COMMANDS)),
    )
    .expect("failed to run tauri-build");
}
