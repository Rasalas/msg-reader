use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use std::io::Write;

/// Store pending file path for when app is launched via file association
pub struct PendingFile(pub Mutex<Option<PathBuf>>);

/// Read a file from the filesystem and return its bytes
#[tauri::command]
fn read_file_as_bytes(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| format!("Failed to read file {}: {}", path, e))
}

/// Save a base64-encoded file to temp directory and open with system viewer
#[tauri::command]
fn open_file_with_system(base64_content: String, file_name: String) -> Result<(), String> {
    use base64::{Engine as _, engine::general_purpose::STANDARD};

    // Decode base64 content
    let bytes = STANDARD.decode(&base64_content)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    // Create temp file path
    let temp_dir = std::env::temp_dir();
    let temp_path = temp_dir.join(&file_name);

    // Write to temp file
    let mut file = std::fs::File::create(&temp_path)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write temp file: {}", e))?;

    // Open with system default application
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&temp_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "windows")]
    {
        // Use PowerShell's Start-Process for better path handling
        std::process::Command::new("powershell")
            .args(["-Command", "Start-Process", "-FilePath"])
            .arg(&temp_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&temp_path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    Ok(())
}

/// Get the file that was passed to the app on startup
#[tauri::command]
fn get_pending_file(state: tauri::State<'_, PendingFile>) -> Option<String> {
    let mut pending = state.0.lock().unwrap();
    pending.take().map(|p| p.to_string_lossy().to_string())
}

/// Handle a file being opened - emit event to frontend
fn handle_file_open(app: &AppHandle, path: PathBuf) {
    // Validate file extension
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase());

    match ext.as_deref() {
        Some("msg") | Some("eml") => {
            // Emit event to frontend
            if let Err(e) = app.emit("file-open", path.to_string_lossy().to_string()) {
                eprintln!("Failed to emit file-open event: {}", e);
            }
        }
        _ => {
            eprintln!("Unsupported file type: {:?}", path);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // Handle file opened when app is already running
            if args.len() > 1 {
                let path = PathBuf::from(&args[1]);
                handle_file_open(app, path);
            }
            // Focus the main window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .manage(PendingFile(Mutex::new(None)))
        .setup(|app| {
            // Check for file passed as command-line argument on startup
            let args: Vec<String> = std::env::args().collect();
            if args.len() > 1 {
                let path = PathBuf::from(&args[1]);
                let ext = path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|e| e.to_lowercase());

                if matches!(ext.as_deref(), Some("msg") | Some("eml")) {
                    // Store for later retrieval by frontend
                    app.state::<PendingFile>()
                        .0
                        .lock()
                        .unwrap()
                        .replace(path);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![read_file_as_bytes, get_pending_file, open_file_with_system])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
