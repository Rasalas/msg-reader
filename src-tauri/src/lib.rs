use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager};
use std::io::Write;

/// Store pending file paths for when app is launched via file association
pub struct PendingFiles(pub Mutex<Vec<PathBuf>>);

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

/// Get files that were passed to the app on startup
#[tauri::command]
fn get_pending_files(state: tauri::State<'_, PendingFiles>) -> Vec<String> {
    let mut pending = state.0.lock().unwrap();
    let files: Vec<String> = pending.drain(..).map(|p| p.to_string_lossy().to_string()).collect();
    files
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
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // Handle file opened when app is already running (Windows/Linux)
            if args.len() > 1 {
                let path = PathBuf::from(&args[1]);
                handle_file_open(app, path);
            }
            // Focus the main window
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }))
        .manage(PendingFiles(Mutex::new(Vec::new())))
        .setup(|app| {
            // Check for files passed as command-line arguments on startup (Windows/Linux)
            let args: Vec<String> = std::env::args().collect();
            for arg in args.iter().skip(1) {
                let path = PathBuf::from(arg);
                let ext = path
                    .extension()
                    .and_then(|e| e.to_str())
                    .map(|e| e.to_lowercase());

                if matches!(ext.as_deref(), Some("msg") | Some("eml")) {
                    // Store for later retrieval by frontend
                    app.state::<PendingFiles>()
                        .0
                        .lock()
                        .unwrap()
                        .push(path);
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![read_file_as_bytes, get_pending_files, open_file_with_system]);

    builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // Handle macOS file open events (double-click on file)
            if let tauri::RunEvent::Opened { urls } = event {
                for url in urls {
                    // Convert file:// URL to path
                    if let Ok(path) = url.to_file_path() {
                        // Check if app is ready (has windows)
                        if app.get_webview_window("main").is_some() {
                            // App is running, emit event
                            handle_file_open(app, path);
                        } else {
                            // App is starting up, store for later
                            let ext = path
                                .extension()
                                .and_then(|e| e.to_str())
                                .map(|e| e.to_lowercase());

                            if matches!(ext.as_deref(), Some("msg") | Some("eml")) {
                                app.state::<PendingFiles>()
                                    .0
                                    .lock()
                                    .unwrap()
                                    .push(path);
                            }
                        }
                    }
                }
            }
        });
}
