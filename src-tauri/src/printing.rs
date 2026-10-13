use tauri::WebviewWindow;

/// Opens the native print panel with margins applied before WebKit paginates.
#[tauri::command]
pub async fn print_message(window: WebviewWindow) -> Result<(), String> {
    #[cfg(target_os = "macos")]
    {
        use objc2::{class, msg_send, rc::Retained, runtime::AnyObject, sel};
        use std::sync::mpsc;

        let (sender, receiver) = mpsc::channel();
        window
            .with_webview(move |webview| {
                // Tauri runs this closure on the main thread and keeps the
                // WKWebView alive. Retained Objective-C objects own the print
                // settings and operation throughout setup of the native sheet.
                let result = unsafe {
                    let view = &*webview.inner().cast::<AnyObject>();
                    let supported: bool =
                        msg_send![view, respondsToSelector: sel!(printOperationWithPrintInfo:)];
                    if !supported {
                        Err("Native printing requires macOS 11 or later".to_string())
                    } else {
                        let shared: Retained<AnyObject> =
                            msg_send![class!(NSPrintInfo), sharedPrintInfo];
                        let info: Retained<AnyObject> = msg_send![&*shared, copy];
                        let margin = 15.0 * 72.0 / 25.4;
                        let _: () = msg_send![&*info, setTopMargin: margin];
                        let _: () = msg_send![&*info, setRightMargin: margin];
                        let _: () = msg_send![&*info, setBottomMargin: margin];
                        let _: () = msg_send![&*info, setLeftMargin: margin];
                        let operation: Retained<AnyObject> =
                            msg_send![view, printOperationWithPrintInfo: &*info];
                        let native_window: Retained<AnyObject> = msg_send![view, window];
                        let _: () = msg_send![&*operation, setCanSpawnSeparateThread: true];
                        let _: () = msg_send![&*operation,
                            runOperationModalForWindow: &*native_window,
                            delegate: std::ptr::null::<AnyObject>(),
                            didRunSelector: None::<objc2::runtime::Sel>,
                            contextInfo: std::ptr::null_mut::<std::ffi::c_void>()
                        ];
                        Ok(())
                    }
                };
                let _ = sender.send(result);
            })
            .map_err(|error| error.to_string())?;

        tauri::async_runtime::spawn_blocking(move || receiver.recv())
            .await
            .map_err(|error| error.to_string())?
            .map_err(|error| error.to_string())?
    }

    #[cfg(not(target_os = "macos"))]
    window.print().map_err(|error| error.to_string())
}
