//! Update *notification* only.
//!
//! The app does not self-install updates: the macOS build is ad-hoc signed and
//! not notarized, and there is no maintainer signing key, so a signed
//! auto-update payload cannot be verified. Instead this module asks the public
//! GitHub Releases API whether a newer tag exists and reports it; the user
//! downloads the installer themselves from the release page.
//!
//! Nothing here is trusted input beyond a version tag and a URL: both are only
//! surfaced to the UI after being parsed and sanity-checked.

use crate::error::AppError;

/// Owner/repo of the project's own releases.
const RELEASES_API: &str =
    "https://api.github.com/repos/Mutantcat-Working-Group/TalkWithYourAI/releases/latest";

/// What the UI needs to render a "new version available" notice.
#[derive(Debug, Clone, serde::Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct AvailableRelease {
    /// Tag as published, e.g. `v1.0.20261118`.
    pub version: String,
    /// Release page the user should open.
    pub url: String,
}

/// Compare two date-style versions (`MAJOR.MINOR.YYYYMMDD`, optional `v`).
///
/// Returns `true` when `candidate` is strictly newer than `current`. Components
/// are compared numerically, so `1.0.20261118` beats `1.0.20261117` and
/// `1.2.0` beats `1.1.99`. Unparseable input never reports an update: better to
/// stay quiet than to nag on a malformed tag.
pub fn is_newer_version(candidate: &str, current: &str) -> bool {
    let (Some(a), Some(b)) = (parse_version(candidate), parse_version(current)) else {
        return false;
    };
    a > b
}

fn parse_version(value: &str) -> Option<Vec<u64>> {
    let trimmed = value.trim().trim_start_matches('v').trim_start_matches('V');
    if trimmed.is_empty() {
        return None;
    }
    let mut parts = Vec::new();
    for part in trimmed.split('.') {
        // Tolerate a trailing pre-release suffix such as `1.0.20261118-beta`.
        let digits: String = part.chars().take_while(|c| c.is_ascii_digit()).collect();
        if digits.is_empty() {
            return None;
        }
        parts.push(digits.parse::<u64>().ok()?);
    }
    Some(parts)
}

/// Ask GitHub for the latest release and return it when it is newer than
/// `current_version`. `Ok(None)` means "up to date" (or no releases yet).
pub async fn check_latest_release(
    client: &reqwest::Client,
    current_version: &str,
) -> Result<Option<AvailableRelease>, AppError> {
    let response = client
        .get(RELEASES_API)
        .header("Accept", "application/vnd.github+json")
        // GitHub rejects requests without a User-Agent.
        .header(
            "User-Agent",
            concat!("TalkWithYourAI/", env!("CARGO_PKG_VERSION")),
        )
        .send()
        .await?;

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        // No published release yet; that is not an error worth surfacing.
        return Ok(None);
    }
    if !response.status().is_success() {
        return Err(AppError::Network(format!(
            "GitHub releases API returned HTTP {}",
            response.status()
        )));
    }

    let body: serde_json::Value = response.json().await?;
    let tag = body["tag_name"].as_str().unwrap_or_default().to_string();
    let url = body["html_url"].as_str().unwrap_or_default().to_string();

    if tag.is_empty() || url.is_empty() || !url.starts_with("https://github.com/") {
        return Ok(None);
    }
    if !is_newer_version(&tag, current_version) {
        return Ok(None);
    }

    Ok(Some(AvailableRelease { version: tag, url }))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn newer_date_versions_are_detected() {
        assert!(is_newer_version("v1.0.20261118", "1.0.20261117"));
        assert!(is_newer_version("1.0.20261118", "v1.0.20261117"));
        assert!(!is_newer_version("1.0.20261117", "1.0.20261117"));
        assert!(!is_newer_version("1.0.20261116", "1.0.20261117"));
    }

    #[test]
    fn numeric_comparison_is_not_lexical() {
        // 20261118 > 20261117 numerically; a string compare would agree here,
        // but 1.0.999 vs 1.0.1000 would not.
        assert!(is_newer_version("1.0.1000", "1.0.999"));
        assert!(is_newer_version("1.2.0", "1.1.99"));
    }

    #[test]
    fn malformed_versions_never_report_an_update() {
        assert!(!is_newer_version("", "1.0.1"));
        assert!(!is_newer_version("latest", "1.0.1"));
        assert!(!is_newer_version("1.0.1", "nightly"));
        assert!(!is_newer_version("v", "1.0.1"));
    }

    #[test]
    fn prerelease_suffix_is_ignored_for_comparison() {
        assert!(is_newer_version("1.0.20261118-beta", "1.0.20261117"));
        assert!(!is_newer_version("1.0.20261117-beta", "1.0.20261117"));
    }
}
