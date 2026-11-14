use std::collections::HashSet;
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::webview::NewWindowResponse;
use tauri::{AppHandle, DragDropEvent, Emitter, Manager, Url, WebviewWindowBuilder, WindowEvent};
use tauri_plugin_dialog::DialogExt;

mod printing;
mod security;

/// Store pending file paths for when app is launched via file association
pub struct PendingFiles(pub Mutex<Vec<PathBuf>>);

/// Email files the user handed to the app (file association, CLI, drag & drop).
/// `read_file_as_bytes` only serves paths from this set.
#[derive(Default)]
pub struct OpenedFiles(Mutex<HashSet<PathBuf>>);

impl OpenedFiles {
    fn grant(&self, path: &Path) {
        if !security::is_email_file(path) {
            return;
        }
        if let Ok(canonical) = path.canonicalize() {
            self.0.lock().unwrap().insert(canonical);
        }
    }

    fn is_granted(&self, path: &Path) -> bool {
        match path.canonicalize() {
            Ok(canonical) => self.0.lock().unwrap().contains(&canonical),
            Err(_) => false,
        }
    }
}

/// Read an email file the user opened and return its bytes
#[tauri::command]
fn read_file_as_bytes(path: String, opened: tauri::State<'_, OpenedFiles>) -> Result<Vec<u8>, String> {
    let path = PathBuf::from(path);
    if !security::is_email_file(&path) || !opened.is_granted(&path) {
        return Err("Access denied: file was not opened by the user".to_string());
    }
    std::fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))
}

/// Save a base64-encoded PDF to a private temp directory and open it with the system viewer
#[tauri::command]
fn open_pdf_with_system(base64_content: String, file_name: String) -> Result<(), String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};

    let bytes = STANDARD
        .decode(&base64_content)
        .map_err(|e| format!("Failed to decode base64: {}", e))?;

    let dir = security::create_private_temp_dir()
        .map_err(|e| format!("Failed to create temp directory: {}", e))?;
    let temp_path = dir.join(security::safe_file_name(&file_name, Some("pdf")));

    let mut file = std::fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&temp_path)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;
    file.write_all(&bytes)
        .map_err(|e| format!("Failed to write temp file: {}", e))?;
    drop(file);

    tauri_plugin_opener::open_path(&temp_path, None::<&str>)
        .map_err(|e| format!("Failed to open file: {}", e))
}

/// Save a file with a "Save As" dialog
#[tauri::command]
async fn save_file_with_dialog(
    app: AppHandle,
    base64_content: String,
    file_name: String,
) -> Result<bool, String> {
    use base64::{engine::general_purpose::STANDARD, Engine as _};
    use tauri_plugin_dialog::FilePath;

    let file_name = security::safe_file_name(&file_name, None);

    // Extract file extension for filter
    let extension = std::path::Path::new(&file_name)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_string();

    // Build the save dialog
    let file_path = app
        .dialog()
        .file()
        .set_file_name(&file_name)
        .add_filter("File", &[&extension])
        .blocking_save_file();

    match file_path {
        Some(FilePath::Path(path)) => {
            // Decode base64 content
            let bytes = STANDARD
                .decode(&base64_content)
                .map_err(|e| format!("Failed to decode base64: {}", e))?;

            // Write to the selected file
            let mut file = std::fs::File::create(&path)
                .map_err(|e| format!("Failed to create file: {}", e))?;
            file.write_all(&bytes)
                .map_err(|e| format!("Failed to write file: {}", e))?;

            Ok(true)
        }
        _ => Ok(false), // User cancelled
    }
}

/// Get files that were passed to the app on startup
#[tauri::command]
fn get_pending_files(state: tauri::State<'_, PendingFiles>) -> Vec<String> {
    let mut pending = state.0.lock().unwrap();
    let files: Vec<String> = pending.drain(..).map(|p| p.to_string_lossy().to_string()).collect();
    files
}

/// Queue a file opened before the frontend is ready
fn queue_pending_file(app: &AppHandle, path: PathBuf) {
    if !security::is_email_file(&path) {
        return;
    }
    app.state::<OpenedFiles>().grant(&path);
    app.state::<PendingFiles>().0.lock().unwrap().push(path);
}

/// Handle a file being opened - emit event to frontend
fn handle_file_open(app: &AppHandle, path: PathBuf) {
    if !security::is_email_file(&path) {
        eprintln!("Unsupported file type: {:?}", path);
        return;
    }

    app.state::<OpenedFiles>().grant(&path);
    if let Err(e) = app.emit("file-open", path.to_string_lossy().to_string()) {
        eprintln!("Failed to emit file-open event: {}", e);
    }
}

fn grant_dropped_files(app: &AppHandle, event: &DragDropEvent) {
    if let DragDropEvent::Drop { paths, .. } = event {
        let opened = app.state::<OpenedFiles>();
        for path in paths {
            opened.grant(path);
        }
    }
}

/// Keeps the main webview on the app's own pages; web links go to the system browser.
fn handle_navigation(app: &AppHandle, url: &Url) -> bool {
    if security::is_app_url(url, app.config().build.dev_url.as_ref()) {
        return true;
    }
    if security::is_external_link(url) {
        if let Err(e) = tauri_plugin_opener::open_url(url.as_str(), None::<&str>) {
            eprintln!("Failed to open link: {}", e);
        }
    }
    false
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
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
        .manage(OpenedFiles::default())
        .on_window_event(|window, event| {
            if let WindowEvent::DragDrop(drop) = event {
                grant_dropped_files(window.app_handle(), drop);
            }
        })
        .on_webview_event(|webview, event| {
            if let tauri::WebviewEvent::DragDrop(drop) = event {
                grant_dropped_files(webview.app_handle(), drop);
            }
        })
        .setup(|app| {
            // Check for files passed as command-line arguments on startup (Windows/Linux)
            let handle = app.handle().clone();
            for arg in std::env::args().skip(1) {
                queue_pending_file(&handle, PathBuf::from(arg));
            }

            // Created here instead of from config so navigation can be restricted
            let window_config = app
                .config()
                .app
                .windows
                .iter()
                .find(|w| w.label == "main")
                .cloned()
                .ok_or("missing main window config")?;
            let nav_handle = handle.clone();
            let popup_handle = handle.clone();
            WebviewWindowBuilder::from_config(app, &window_config)?
                .on_navigation(move |url| handle_navigation(&nav_handle, url))
                .on_new_window(move |url, _features| {
                    handle_navigation(&popup_handle, &url);
                    NewWindowResponse::Deny
                })
                .build()?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_file_as_bytes,
            get_pending_files,
            open_pdf_with_system,
            save_file_with_dialog,
            printing::print_message
        ]);

    builder
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|app, event| {
            // Handle macOS file open events (double-click on file)
            // This event only exists on macOS
            #[cfg(target_os = "macos")]
            if let tauri::RunEvent::Opened { urls } = &event {
                for url in urls {
                    if let Ok(path) = url.to_file_path() {
                        if app.get_webview_window("main").is_some() {
                            handle_file_open(app, path);
                        } else {
                            queue_pending_file(app, path);
                        }
                    }
                }
            }

            // Suppress unused variable warning on non-macOS
            #[cfg(not(target_os = "macos"))]
            let _ = (app, event);
        });
}
