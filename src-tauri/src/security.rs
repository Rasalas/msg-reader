use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicU64, Ordering};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Url;

const MAX_FILE_STEM_CHARS: usize = 120;

pub fn is_email_file(path: &Path) -> bool {
    matches!(
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.to_ascii_lowercase())
            .as_deref(),
        Some("msg") | Some("eml")
    )
}

/// Reduces an untrusted attachment name to a plain file name.
/// With `forced_extension`, any other extension is replaced by it.
pub fn safe_file_name(name: &str, forced_extension: Option<&str>) -> String {
    let base = name.rsplit(['/', '\\']).next().unwrap_or("");
    let cleaned: String = base
        .chars()
        .map(|c| {
            if c.is_alphanumeric() || matches!(c, ' ' | '-' | '_' | '.' | '(' | ')' | '+' | ',') {
                c
            } else {
                '_'
            }
        })
        .collect();
    let cleaned = cleaned.trim_matches(|c: char| c == '.' || c == ' ');

    let (stem, extension) = match cleaned.rsplit_once('.') {
        Some((stem, ext)) if !stem.is_empty() && !ext.is_empty() => (stem, Some(ext)),
        _ => (cleaned, None),
    };
    let extension = forced_extension.or(extension);

    let mut stem: String = stem.chars().take(MAX_FILE_STEM_CHARS).collect();
    stem = stem.trim_end_matches(['.', ' ']).to_string();
    if stem.is_empty() {
        stem = "attachment".to_string();
    }
    if is_windows_reserved_name(&stem) {
        stem.insert(0, '_');
    }

    match extension {
        Some(ext) => format!("{}.{}", stem, ext.to_ascii_lowercase()),
        None => stem,
    }
}

fn is_windows_reserved_name(stem: &str) -> bool {
    let device = stem.split('.').next().unwrap_or("").trim().to_ascii_uppercase();
    matches!(device.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || (device.len() == 4
            && (device.starts_with("COM") || device.starts_with("LPT"))
            && device[3..].chars().all(|c| c.is_ascii_digit()))
}

/// Creates a fresh directory under the system temp dir that no other file shares.
pub fn create_private_temp_dir() -> std::io::Result<PathBuf> {
    static COUNTER: AtomicU64 = AtomicU64::new(0);

    let root = std::env::temp_dir().join("msgReader");
    std::fs::create_dir_all(&root)?;

    loop {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_nanos())
            .unwrap_or(0);
        let unique = format!(
            "{}-{}-{}",
            std::process::id(),
            nanos,
            COUNTER.fetch_add(1, Ordering::Relaxed)
        );
        let dir = root.join(unique);
        match std::fs::create_dir(&dir) {
            Ok(()) => {
                #[cfg(unix)]
                {
                    use std::os::unix::fs::PermissionsExt;
                    std::fs::set_permissions(&dir, std::fs::Permissions::from_mode(0o700))?;
                }
                return Ok(dir);
            }
            Err(e) if e.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(e) => return Err(e),
        }
    }
}

/// True for the app's own pages and same-document frames.
pub fn is_app_url(url: &Url, dev_url: Option<&Url>) -> bool {
    match url.scheme() {
        "tauri" => url.host_str() == Some("localhost"),
        "http" | "https" if url.host_str() == Some("tauri.localhost") => true,
        "about" | "blob" => true,
        _ => {
            cfg!(debug_assertions)
                && dev_url.is_some_and(|dev| dev.origin() == url.origin())
        }
    }
}

pub fn is_external_link(url: &Url) -> bool {
    matches!(url.scheme(), "http" | "https" | "mailto")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_directories_and_traversal() {
        assert_eq!(safe_file_name("../../evil.pdf", Some("pdf")), "evil.pdf");
        assert_eq!(safe_file_name("..\\..\\Startup\\evil.pdf", Some("pdf")), "evil.pdf");
        assert_eq!(safe_file_name("/etc/passwd", None), "passwd");
        assert_eq!(safe_file_name("..", Some("pdf")), "attachment.pdf");
        assert_eq!(safe_file_name("", None), "attachment");
    }

    #[test]
    fn forces_extension() {
        assert_eq!(safe_file_name("invoice.exe", Some("pdf")), "invoice.pdf");
        assert_eq!(safe_file_name("invoice", Some("pdf")), "invoice.pdf");
        assert_eq!(safe_file_name("Report.PDF", Some("pdf")), "Report.pdf");
        assert_eq!(safe_file_name("a.pdf.lnk", Some("pdf")), "a.pdf.pdf");
    }

    #[test]
    fn removes_shell_metacharacters() {
        assert_eq!(safe_file_name("a&calc.pdf", Some("pdf")), "a_calc.pdf");
        assert_eq!(safe_file_name("x\"|<>^%.pdf", Some("pdf")), "x______.pdf");
        assert_eq!(safe_file_name("file:stream.pdf", Some("pdf")), "file_stream.pdf");
    }

    #[test]
    fn avoids_windows_device_names() {
        assert_eq!(safe_file_name("CON.pdf", Some("pdf")), "_CON.pdf");
        assert_eq!(safe_file_name("com1.pdf", Some("pdf")), "_com1.pdf");
        assert_eq!(safe_file_name("console.pdf", Some("pdf")), "console.pdf");
    }

    #[test]
    fn detects_email_files() {
        assert!(is_email_file(Path::new("/tmp/a.MSG")));
        assert!(is_email_file(Path::new("C:\\x\\b.eml")));
        assert!(!is_email_file(Path::new("/home/u/.ssh/id_rsa")));
        assert!(!is_email_file(Path::new("/tmp/msg")));
    }

    #[test]
    fn classifies_navigation_targets() {
        let parse = |s: &str| Url::parse(s).unwrap();
        assert!(is_app_url(&parse("tauri://localhost/index.html"), None));
        assert!(is_app_url(&parse("http://tauri.localhost/#messageViewer"), None));
        assert!(is_app_url(&parse("about:blank"), None));
        assert!(!is_app_url(&parse("https://evil.example/"), None));
        assert!(!is_app_url(&parse("file:///etc/passwd"), None));
        assert!(!is_app_url(&parse("tauri://evil/"), None));

        assert!(is_external_link(&parse("https://example.com")));
        assert!(is_external_link(&parse("mailto:a@example.com")));
        assert!(!is_external_link(&parse("file:///C:/Windows/System32/calc.exe")));
        assert!(!is_external_link(&parse("smb://host/share")));
    }

    #[test]
    fn private_temp_dirs_are_unique() {
        let a = create_private_temp_dir().unwrap();
        let b = create_private_temp_dir().unwrap();
        assert_ne!(a, b);
        std::fs::remove_dir(a).unwrap();
        std::fs::remove_dir(b).unwrap();
    }
}
