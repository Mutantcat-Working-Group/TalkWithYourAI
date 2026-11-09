pub mod clipboard;
pub mod keyboard;
pub mod windows_modifier_guard;
pub mod windows_sendinput;

use crate::error::{AppError, UserError};
use async_trait::async_trait;
use serde::Serialize;

#[derive(Debug, Clone, Copy, PartialEq)]
pub enum OutputMode {
    Keyboard,
    Clipboard,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum InsertionStrategy {
    Auto,
    Keyboard,
    ClipboardPaste,
    ClipboardCopyOnly,
    WindowsSendInput,
}

impl InsertionStrategy {
    pub fn from_config_value(value: &str) -> Self {
        match value {
            "keyboard" => Self::Keyboard,
            "clipboardPaste" => Self::ClipboardPaste,
            "clipboardCopyOnly" => Self::ClipboardCopyOnly,
            "windowsSendInput" => Self::WindowsSendInput,
            _ => Self::Auto,
        }
    }

    pub fn direct_streaming_strategy(self) -> Option<Self> {
        match self {
            Self::Auto | Self::Keyboard => Some(Self::Keyboard),
            Self::WindowsSendInput => Some(Self::WindowsSendInput),
            Self::ClipboardPaste | Self::ClipboardCopyOnly => None,
        }
    }

    pub fn needs_keyboard_access(self) -> bool {
        matches!(self, Self::Auto | Self::Keyboard | Self::WindowsSendInput)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum InsertStatus {
    Inserted,
    CopiedFallback,
    Failed,
    PartiallyInserted,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InsertResult {
    pub status: InsertStatus,
    pub strategy_used: InsertionStrategy,
    pub chars_inserted: usize,
    pub chars_copied: usize,
    pub warning_code: Option<String>,
    pub message: Option<String>,
}

impl InsertResult {
    pub fn inserted(strategy_used: InsertionStrategy, chars_inserted: usize) -> Self {
        Self {
            status: InsertStatus::Inserted,
            strategy_used,
            chars_inserted,
            chars_copied: 0,
            warning_code: None,
            message: None,
        }
    }

    pub fn copied_fallback(strategy_used: InsertionStrategy, chars_copied: usize) -> Self {
        Self {
            status: InsertStatus::CopiedFallback,
            strategy_used,
            chars_inserted: 0,
            chars_copied,
            warning_code: None,
            message: None,
        }
    }

    #[allow(dead_code)]
    pub fn failed(strategy_used: InsertionStrategy) -> Self {
        Self {
            status: InsertStatus::Failed,
            strategy_used,
            chars_inserted: 0,
            chars_copied: 0,
            warning_code: None,
            message: None,
        }
    }

    #[allow(dead_code)]
    pub fn partially_inserted(strategy_used: InsertionStrategy, chars_inserted: usize) -> Self {
        Self {
            status: InsertStatus::PartiallyInserted,
            strategy_used,
            chars_inserted,
            chars_copied: 0,
            warning_code: None,
            message: None,
        }
    }

    pub fn with_warning(mut self, warning: &UserError) -> Self {
        self.warning_code = Some(warning.code.clone());
        self.message = warning.details.clone();
        self
    }
}

#[derive(Debug, Clone)]
pub struct OutputOutcome {
    pub insert_result: InsertResult,
    pub warning: Option<UserError>,
}

#[async_trait]
pub trait TextOutput: Send + Sync {
    async fn type_text(&self, text: &str) -> Result<InsertResult, AppError>;
    fn mode(&self) -> OutputMode;
}

/// A single emitted character in a terminal line-continuation rewrite.
///
/// Text-mode output writes `Literal` chars without key simulation and sends
/// `Return` as one Enter key press.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum NewlineSegment {
    Literal(char),
    Return,
}

/// Rewrite newlines for terminal/CLI targets.
///
/// A dictation typed into a shell must never carry a bare Enter: that would
/// submit the (partial) command. Instead every `\n` becomes a literal
/// backslash followed by Enter, which POSIX shells, PowerShell, and cmd all
/// accept as a line continuation. Non-terminal and unknown targets receive
/// `None` and therefore keep their normal newline behaviour.
///
/// Only applies to the keyboard insertion paths. The clipboard fallback keeps
/// the original text (see `clipboard`).
pub fn terminal_line_continuation_segments(
    text: &str,
    terminal_target: bool,
) -> Option<Vec<NewlineSegment>> {
    if !terminal_target {
        return None;
    }

    let mut segments = Vec::with_capacity(text.chars().count());
    let mut chars = text.chars().peekable();
    while let Some(ch) = chars.next() {
        match ch {
            '\r' => {
                // Normalise CRLF/CR to one line break that still continues
                // the command rather than submitting it.
                if chars.peek() != Some(&'\n') {
                    segments.push(NewlineSegment::Literal('\\'));
                    segments.push(NewlineSegment::Return);
                }
            }
            '\n' => {
                segments.push(NewlineSegment::Literal('\\'));
                segments.push(NewlineSegment::Return);
            }
            other => segments.push(NewlineSegment::Literal(other)),
        }
    }
    Some(segments)
}

/// True when the keyboard path must apply the terminal rewrite.
///
/// The rewrite is scoped by the detected app family, so unknown apps
/// (`ContextFamily::General` fallback) and normal apps (chat, email, docs,
/// editors) never take this branch.
pub fn should_rewrite_newlines_for_terminal(
    family: crate::app_detector::types::ContextFamily,
) -> bool {
    family.is_terminal()
}

pub fn create_output(mode: OutputMode, app_handle: &tauri::AppHandle) -> Box<dyn TextOutput> {
    create_output_with_clipboard_options(
        mode,
        app_handle,
        clipboard::ClipboardOutputOptions::default(),
    )
}

pub fn create_output_with_clipboard_options(
    mode: OutputMode,
    app_handle: &tauri::AppHandle,
    clipboard_options: clipboard::ClipboardOutputOptions,
) -> Box<dyn TextOutput> {
    match mode {
        OutputMode::Keyboard => Box::new(keyboard::KeyboardOutput::new(app_handle)),
        OutputMode::Clipboard => {
            Box::new(clipboard::ClipboardOutput::with_options(clipboard_options))
        }
    }
}

fn clipboard_warning_for_platform() -> Option<UserError> {
    if crate::platform::is_wayland_session() {
        Some(UserError {
            code: "output_wayland_clipboard_copy_only".to_string(),
            details: None,
            retry_count: 0,
        })
    } else {
        None
    }
}

/// Try keyboard output first. On failure, fall back to clipboard.
/// Returns Ok(Some(UserError)) if fell back to clipboard (warning for frontend).
/// Returns Ok(None) if primary output succeeded.
/// Returns Err if both keyboard and clipboard failed.
pub async fn output_with_fallback(
    app_handle: &tauri::AppHandle,
    text: &str,
    mode: OutputMode,
    clipboard_options: clipboard::ClipboardOutputOptions,
) -> Result<OutputOutcome, String> {
    let strategy = match mode {
        OutputMode::Keyboard => InsertionStrategy::Auto,
        OutputMode::Clipboard => InsertionStrategy::ClipboardPaste,
    };
    output_with_strategy(
        app_handle,
        text,
        strategy,
        clipboard_options,
        windows_sendinput::WindowsSendInputOptions::default(),
    )
    .await
}

pub async fn output_with_strategy(
    app_handle: &tauri::AppHandle,
    text: &str,
    strategy: InsertionStrategy,
    clipboard_options: clipboard::ClipboardOutputOptions,
    windows_sendinput_options: windows_sendinput::WindowsSendInputOptions,
) -> Result<OutputOutcome, String> {
    output_with_strategy_for_target(
        app_handle,
        text,
        strategy,
        clipboard_options,
        windows_sendinput_options,
        false,
    )
    .await
}

/// Like `output_with_strategy`, but advertises that the foreground target is a
/// terminal/CLI surface when `terminal_target` is true. Only the keyboard
/// insertion paths then rewrite `\n` as backslash + Enter.
pub async fn output_with_strategy_for_target(
    app_handle: &tauri::AppHandle,
    text: &str,
    strategy: InsertionStrategy,
    clipboard_options: clipboard::ClipboardOutputOptions,
    windows_sendinput_options: windows_sendinput::WindowsSendInputOptions,
    terminal_target: bool,
) -> Result<OutputOutcome, String> {
    let keyboard: Box<dyn TextOutput> = if terminal_target {
        Box::new(keyboard::KeyboardOutput::new_terminal(app_handle))
    } else {
        create_output(OutputMode::Keyboard, app_handle)
    };
    let windows_sendinput = windows_sendinput::WindowsSendInputOutput::new_terminal(
        windows_sendinput_options,
        terminal_target,
    );
    let clipboard_paste =
        create_output_with_clipboard_options(OutputMode::Clipboard, app_handle, clipboard_options);
    let clipboard_copy = create_output_with_clipboard_options(
        OutputMode::Clipboard,
        app_handle,
        clipboard::ClipboardOutputOptions {
            auto_paste: false,
            ..clipboard_options
        },
    );

    output_with_strategy_using(
        text,
        strategy,
        keyboard.as_ref(),
        &windows_sendinput,
        clipboard_paste.as_ref(),
        clipboard_copy.as_ref(),
        clipboard_warning_for_platform(),
    )
    .await
}

pub async fn output_stream_chunk(
    app_handle: &tauri::AppHandle,
    text: &str,
    strategy: InsertionStrategy,
    windows_sendinput_options: windows_sendinput::WindowsSendInputOptions,
    terminal_target: bool,
) -> Result<InsertResult, String> {
    match strategy.direct_streaming_strategy() {
        Some(InsertionStrategy::Keyboard) => {
            let keyboard: Box<dyn TextOutput> = if terminal_target {
                Box::new(keyboard::KeyboardOutput::new_terminal(app_handle))
            } else {
                create_output(OutputMode::Keyboard, app_handle)
            };
            keyboard.type_text(text).await.map_err(|e| e.to_string())
        }
        Some(InsertionStrategy::WindowsSendInput) => {
            windows_sendinput::WindowsSendInputOutput::new_terminal(
                windows_sendinput_options,
                terminal_target,
            )
            .type_text(text)
            .await
            .map_err(|e| e.to_string())
        }
        _ => Err(format!(
            "Insertion strategy {:?} does not support streaming chunks",
            strategy
        )),
    }
}

#[cfg(test)]
async fn output_with_fallback_using(
    text: &str,
    mode: OutputMode,
    keyboard: &dyn TextOutput,
    clipboard: &dyn TextOutput,
    clipboard_warning: Option<UserError>,
) -> Result<OutputOutcome, String> {
    let strategy = match mode {
        OutputMode::Keyboard => InsertionStrategy::Auto,
        OutputMode::Clipboard => InsertionStrategy::ClipboardPaste,
    };
    output_with_strategy_using(
        text,
        strategy,
        keyboard,
        keyboard,
        clipboard,
        clipboard,
        clipboard_warning,
    )
    .await
}

async fn output_with_strategy_using(
    text: &str,
    strategy: InsertionStrategy,
    keyboard: &dyn TextOutput,
    windows_sendinput: &dyn TextOutput,
    clipboard_paste: &dyn TextOutput,
    clipboard_copy: &dyn TextOutput,
    clipboard_warning: Option<UserError>,
) -> Result<OutputOutcome, String> {
    if strategy == InsertionStrategy::ClipboardCopyOnly {
        return clipboard_copy
            .type_text(text)
            .await
            .map_err(|e| e.to_string())
            .map(|insert_result| OutputOutcome {
                insert_result,
                warning: None,
            });
    }

    if strategy == InsertionStrategy::WindowsSendInput {
        return match windows_sendinput.type_text(text).await {
            Ok(insert_result) if insert_result.status == InsertStatus::Inserted => {
                Ok(OutputOutcome {
                    insert_result,
                    warning: None,
                })
            }
            Ok(insert_result) if insert_result.status == InsertStatus::PartiallyInserted => {
                let expected_chars = windows_sendinput::expected_sendinput_typed_chars(text);
                tracing::warn!(
                    "Windows SendInput inserted {}/{} chars, copying full text to clipboard",
                    insert_result.chars_inserted,
                    expected_chars
                );
                match clipboard_copy.type_text(text).await {
                    Ok(copy_result) => {
                        let warning = UserError {
                            code: "output_fallback_clipboard".to_string(),
                            details: Some(format!(
                                "Windows SendInput inserted {}/{} chars; copied full text to clipboard",
                                insert_result.chars_inserted,
                                expected_chars
                            )),
                            retry_count: 0,
                        };
                        Ok(OutputOutcome {
                            insert_result: insert_result_with_optional_warning(
                                copy_result,
                                Some(&warning),
                            ),
                            warning: Some(warning),
                        })
                    }
                    Err(cb_err) => Err(format!(
                        "Windows SendInput partially inserted {} chars and clipboard copy failed ({})",
                        insert_result.chars_inserted, cb_err
                    )),
                }
            }
            Ok(insert_result) => Ok(OutputOutcome {
                insert_result,
                warning: None,
            }),
            Err(sendinput_err) => {
                tracing::warn!(
                    "Windows SendInput output failed: {}, falling back to clipboard",
                    sendinput_err
                );
                match clipboard_paste.type_text(text).await {
                    Ok(insert_result) => {
                        let warning = clipboard_warning.or(Some(UserError {
                            code: "output_fallback_clipboard".to_string(),
                            details: Some(sendinput_err.to_string()),
                            retry_count: 0,
                        }));
                        Ok(OutputOutcome {
                            insert_result: insert_result_with_optional_warning(
                                insert_result,
                                warning.as_ref(),
                            ),
                            warning,
                        })
                    }
                    Err(cb_err) => Err(format!(
                        "Both Windows SendInput ({}) and clipboard ({}) output failed",
                        sendinput_err, cb_err
                    )),
                }
            }
        };
    }

    if strategy == InsertionStrategy::ClipboardPaste {
        return clipboard_paste
            .type_text(text)
            .await
            .map_err(|e| e.to_string())
            .map(|insert_result| OutputOutcome {
                insert_result: insert_result_with_optional_warning(
                    insert_result,
                    clipboard_warning.as_ref(),
                ),
                warning: clipboard_warning,
            });
    }

    // Try keyboard first
    match keyboard.type_text(text).await {
        Ok(insert_result) => Ok(OutputOutcome {
            insert_result,
            warning: None,
        }),
        Err(kb_err) => {
            tracing::warn!(
                "Keyboard output failed: {}, falling back to clipboard",
                kb_err
            );
            match clipboard_paste.type_text(text).await {
                Ok(insert_result) => {
                    let warning = clipboard_warning.or(Some(UserError {
                        code: "output_fallback_clipboard".to_string(),
                        details: Some(kb_err.to_string()),
                        retry_count: 0,
                    }));
                    Ok(OutputOutcome {
                        insert_result: insert_result_with_optional_warning(
                            insert_result,
                            warning.as_ref(),
                        ),
                        warning,
                    })
                }
                Err(cb_err) => Err(format!(
                    "Both keyboard ({}) and clipboard ({}) output failed",
                    kb_err, cb_err
                )),
            }
        }
    }
}

fn insert_result_with_optional_warning(
    insert_result: InsertResult,
    warning: Option<&UserError>,
) -> InsertResult {
    match warning {
        Some(warning) => insert_result.with_warning(warning),
        None => insert_result,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use async_trait::async_trait;

    struct FakeOutput {
        mode: OutputMode,
        result: Result<InsertResult, &'static str>,
    }

    impl FakeOutput {
        fn ok(mode: OutputMode, result: InsertResult) -> Self {
            Self {
                mode,
                result: Ok(result),
            }
        }

        fn err(mode: OutputMode, message: &'static str) -> Self {
            Self {
                mode,
                result: Err(message),
            }
        }
    }

    #[async_trait]
    impl TextOutput for FakeOutput {
        async fn type_text(&self, _text: &str) -> Result<InsertResult, AppError> {
            self.result
                .clone()
                .map_err(|message| AppError::Output(message.to_string()))
        }

        fn mode(&self) -> OutputMode {
            self.mode
        }
    }

    fn rendered(segments: &[NewlineSegment]) -> String {
        segments
            .iter()
            .map(|segment| match segment {
                NewlineSegment::Literal(ch) => *ch,
                NewlineSegment::Return => '\n',
            })
            .collect()
    }

    #[test]
    fn terminal_newline_rewrite_emits_backslash_before_every_enter() {
        let segments = terminal_line_continuation_segments("git commit -m \"fix\"\nls -la", true)
            .expect("terminal targets rewrite newlines");

        assert_eq!(rendered(&segments), "git commit -m \"fix\"\\\nls -la");
        // The backslash and the Return always travel together.
        for (index, segment) in segments.iter().enumerate() {
            if *segment == NewlineSegment::Return {
                assert_eq!(segments[index - 1], NewlineSegment::Literal('\\'));
            }
        }
    }

    #[test]
    fn terminal_newline_rewrite_keeps_single_line_text_untouched() {
        let segments = terminal_line_continuation_segments("docker ps", true).unwrap();

        assert_eq!(rendered(&segments), "docker ps");
        assert!(!segments.contains(&NewlineSegment::Return));
    }

    #[test]
    fn terminal_newline_rewrite_handles_crlf_and_trailing_newline() {
        let crlf = terminal_line_continuation_segments("a\r\nb", true).unwrap();
        assert_eq!(rendered(&crlf), "a\\\nb");

        let trailing = terminal_line_continuation_segments("a\n", true).unwrap();
        assert_eq!(rendered(&trailing), "a\\\n");
    }

    #[test]
    fn non_terminal_apps_keep_plain_newlines() {
        for family in [
            crate::app_detector::types::ContextFamily::WorkChat,
            crate::app_detector::types::ContextFamily::Email,
            crate::app_detector::types::ContextFamily::PromptOrCode,
            crate::app_detector::types::ContextFamily::Document,
        ] {
            assert!(!should_rewrite_newlines_for_terminal(family));
            assert_eq!(
                terminal_line_continuation_segments("one\ntwo", family.is_terminal()),
                None
            );
        }
    }

    #[test]
    fn unknown_apps_do_not_rewrite_newlines() {
        // General is the fallback family for apps the detector does not know.
        let family = crate::app_detector::types::ContextFamily::General;
        assert!(!should_rewrite_newlines_for_terminal(family));
        assert_eq!(terminal_line_continuation_segments("one\ntwo", false), None);
    }

    #[test]
    fn slack_and_gmail_style_text_survives_the_normal_path_unchanged() {
        let text = "Line one\nLine two";
        assert_eq!(text, "Line one\nLine two");
        assert_eq!(
            terminal_line_continuation_segments(text, false),
            None,
            "a non-terminal target must never rewrite newlines"
        );
    }

    #[test]
    fn terminal_families_request_the_rewrite() {
        assert!(should_rewrite_newlines_for_terminal(
            crate::app_detector::types::ContextFamily::Terminal
        ));
    }

    #[test]
    fn direct_streaming_strategy_allows_only_direct_insert_paths() {
        assert_eq!(
            InsertionStrategy::Auto.direct_streaming_strategy(),
            Some(InsertionStrategy::Keyboard)
        );
        assert_eq!(
            InsertionStrategy::Keyboard.direct_streaming_strategy(),
            Some(InsertionStrategy::Keyboard)
        );
        assert_eq!(
            InsertionStrategy::WindowsSendInput.direct_streaming_strategy(),
            Some(InsertionStrategy::WindowsSendInput)
        );
        assert_eq!(
            InsertionStrategy::ClipboardPaste.direct_streaming_strategy(),
            None
        );
        assert_eq!(
            InsertionStrategy::ClipboardCopyOnly.direct_streaming_strategy(),
            None
        );
    }

    #[tokio::test]
    async fn keyboard_success_returns_structured_insert_result() {
        let keyboard = FakeOutput::ok(
            OutputMode::Keyboard,
            InsertResult::inserted(InsertionStrategy::Keyboard, 5),
        );
        let clipboard = FakeOutput::err(OutputMode::Clipboard, "clipboard should not be used");

        let outcome =
            output_with_fallback_using("hello", OutputMode::Keyboard, &keyboard, &clipboard, None)
                .await
                .unwrap();

        assert_eq!(outcome.insert_result.status, InsertStatus::Inserted);
        assert_eq!(
            outcome.insert_result.strategy_used,
            InsertionStrategy::Keyboard
        );
        assert_eq!(outcome.insert_result.chars_inserted, 5);
        assert!(outcome.warning.is_none());
    }

    #[tokio::test]
    async fn keyboard_failure_returns_clipboard_result_with_fallback_warning() {
        let keyboard = FakeOutput::err(OutputMode::Keyboard, "keyboard failed");
        let clipboard = FakeOutput::ok(
            OutputMode::Clipboard,
            InsertResult::inserted(InsertionStrategy::ClipboardPaste, 4),
        );

        let outcome =
            output_with_fallback_using("text", OutputMode::Keyboard, &keyboard, &clipboard, None)
                .await
                .unwrap();

        assert_eq!(
            outcome.insert_result.strategy_used,
            InsertionStrategy::ClipboardPaste
        );
        assert_eq!(outcome.insert_result.chars_inserted, 4);
        assert_eq!(
            outcome
                .warning
                .as_ref()
                .map(|warning| warning.code.as_str()),
            Some("output_fallback_clipboard")
        );
        assert_eq!(
            outcome
                .warning
                .as_ref()
                .and_then(|warning| warning.details.as_deref()),
            Some("Output error: keyboard failed")
        );
        assert_eq!(
            outcome.insert_result.warning_code.as_deref(),
            Some("output_fallback_clipboard")
        );
        assert_eq!(
            outcome.insert_result.message.as_deref(),
            Some("Output error: keyboard failed")
        );
    }

    #[tokio::test]
    async fn clipboard_copy_only_strategy_uses_copy_output_without_warning() {
        let keyboard = FakeOutput::err(OutputMode::Keyboard, "keyboard should not be used");
        let windows_sendinput =
            FakeOutput::err(OutputMode::Keyboard, "sendinput should not be used");
        let clipboard_paste = FakeOutput::err(OutputMode::Clipboard, "paste should not be used");
        let clipboard_copy = FakeOutput::ok(
            OutputMode::Clipboard,
            InsertResult::copied_fallback(InsertionStrategy::ClipboardCopyOnly, 4),
        );

        let outcome = output_with_strategy_using(
            "text",
            InsertionStrategy::ClipboardCopyOnly,
            &keyboard,
            &windows_sendinput,
            &clipboard_paste,
            &clipboard_copy,
            None,
        )
        .await
        .unwrap();

        assert_eq!(outcome.insert_result.status, InsertStatus::CopiedFallback);
        assert_eq!(
            outcome.insert_result.strategy_used,
            InsertionStrategy::ClipboardCopyOnly
        );
        assert_eq!(outcome.insert_result.chars_inserted, 0);
        assert_eq!(outcome.insert_result.chars_copied, 4);
        assert!(outcome.warning.is_none());
        assert!(outcome.insert_result.warning_code.is_none());
    }

    #[tokio::test]
    async fn windows_sendinput_success_uses_sendinput_without_clipboard() {
        let keyboard = FakeOutput::err(OutputMode::Keyboard, "keyboard should not be used");
        let windows_sendinput = FakeOutput::ok(
            OutputMode::Keyboard,
            InsertResult::inserted(InsertionStrategy::WindowsSendInput, 4),
        );
        let clipboard_paste = FakeOutput::err(OutputMode::Clipboard, "paste should not be used");
        let clipboard_copy = FakeOutput::err(OutputMode::Clipboard, "copy should not be used");

        let outcome = output_with_strategy_using(
            "text",
            InsertionStrategy::WindowsSendInput,
            &keyboard,
            &windows_sendinput,
            &clipboard_paste,
            &clipboard_copy,
            None,
        )
        .await
        .unwrap();

        assert_eq!(outcome.insert_result.status, InsertStatus::Inserted);
        assert_eq!(
            outcome.insert_result.strategy_used,
            InsertionStrategy::WindowsSendInput
        );
        assert_eq!(outcome.insert_result.chars_inserted, 4);
        assert!(outcome.warning.is_none());
    }

    #[tokio::test]
    async fn windows_sendinput_zero_insert_falls_back_to_clipboard_with_warning() {
        let keyboard = FakeOutput::err(OutputMode::Keyboard, "keyboard should not be used");
        let windows_sendinput = FakeOutput::err(OutputMode::Keyboard, "sendinput failed");
        let clipboard_paste = FakeOutput::ok(
            OutputMode::Clipboard,
            InsertResult::inserted(InsertionStrategy::ClipboardPaste, 4),
        );
        let clipboard_copy = FakeOutput::err(OutputMode::Clipboard, "copy should not be used");

        let outcome = output_with_strategy_using(
            "text",
            InsertionStrategy::WindowsSendInput,
            &keyboard,
            &windows_sendinput,
            &clipboard_paste,
            &clipboard_copy,
            None,
        )
        .await
        .unwrap();

        assert_eq!(
            outcome.insert_result.strategy_used,
            InsertionStrategy::ClipboardPaste
        );
        assert_eq!(
            outcome.insert_result.warning_code.as_deref(),
            Some("output_fallback_clipboard")
        );
        assert_eq!(
            outcome.insert_result.message.as_deref(),
            Some("Output error: sendinput failed")
        );
    }

    #[tokio::test]
    async fn windows_sendinput_partial_insert_copies_full_text_without_pasting_again() {
        let keyboard = FakeOutput::err(OutputMode::Keyboard, "keyboard should not be used");
        let windows_sendinput = FakeOutput::ok(
            OutputMode::Keyboard,
            InsertResult::partially_inserted(InsertionStrategy::WindowsSendInput, 2),
        );
        let clipboard_paste = FakeOutput::err(OutputMode::Clipboard, "paste should not be used");
        let clipboard_copy = FakeOutput::ok(
            OutputMode::Clipboard,
            InsertResult::copied_fallback(InsertionStrategy::ClipboardCopyOnly, 4),
        );

        let outcome = output_with_strategy_using(
            "text",
            InsertionStrategy::WindowsSendInput,
            &keyboard,
            &windows_sendinput,
            &clipboard_paste,
            &clipboard_copy,
            None,
        )
        .await
        .unwrap();

        assert_eq!(outcome.insert_result.status, InsertStatus::CopiedFallback);
        assert_eq!(
            outcome.insert_result.strategy_used,
            InsertionStrategy::ClipboardCopyOnly
        );
        assert_eq!(outcome.insert_result.chars_copied, 4);
        assert_eq!(
            outcome.insert_result.warning_code.as_deref(),
            Some("output_fallback_clipboard")
        );
        assert!(outcome
            .insert_result
            .message
            .as_deref()
            .unwrap_or_default()
            .contains("inserted 2/4 chars"));
    }

    #[tokio::test]
    async fn clipboard_mode_surfaces_platform_warning_and_insert_result() {
        let keyboard = FakeOutput::err(OutputMode::Keyboard, "keyboard should not be used");
        let clipboard = FakeOutput::ok(
            OutputMode::Clipboard,
            InsertResult::copied_fallback(InsertionStrategy::ClipboardCopyOnly, 4),
        );
        let platform_warning = UserError {
            code: "output_wayland_clipboard_copy_only".to_string(),
            details: None,
            retry_count: 0,
        };

        let outcome = output_with_fallback_using(
            "text",
            OutputMode::Clipboard,
            &keyboard,
            &clipboard,
            Some(platform_warning),
        )
        .await
        .unwrap();

        assert_eq!(outcome.insert_result.status, InsertStatus::CopiedFallback);
        assert_eq!(
            outcome.insert_result.strategy_used,
            InsertionStrategy::ClipboardCopyOnly
        );
        assert_eq!(
            outcome
                .warning
                .as_ref()
                .map(|warning| warning.code.as_str()),
            Some("output_wayland_clipboard_copy_only")
        );
    }

    #[tokio::test]
    async fn keyboard_and_clipboard_failure_reports_both_errors() {
        let keyboard = FakeOutput::err(OutputMode::Keyboard, "keyboard failed");
        let clipboard = FakeOutput::err(OutputMode::Clipboard, "clipboard failed");

        let error =
            output_with_fallback_using("text", OutputMode::Keyboard, &keyboard, &clipboard, None)
                .await
                .unwrap_err();

        assert!(error.contains("keyboard failed"));
        assert!(error.contains("clipboard failed"));
    }
}
