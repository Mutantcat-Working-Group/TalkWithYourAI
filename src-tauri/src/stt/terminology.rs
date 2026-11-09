//! Built-in correction of developer / technical terms that speech-to-text
//! engines commonly split into several ordinary words.
//!
//! The table only contains *multi-word mis-hearings* (for example `code x`
//! instead of `Codex`). Single common words are deliberately never rewritten:
//! a blanket replacement of a word such as `cloud` or `code` would corrupt
//! normal prose. Each pattern must match whole words separated only by
//! whitespace, so `code x-ray` is left alone and `code` on its own is never
//! touched.
//!
//! Precedence (highest first):
//! 1. Enabled user correction rules — every explicit `pattern -> replacement`
//!    pair is applied deterministically after the built-in pass.
//! 2. The user dictionary — if it contains a spelling that differs only in case
//!    from a built-in canonical term, that spelling is used instead.
//! 3. The built-in table below. A built-in pattern that a user correction rule
//!    already claims is skipped entirely, so the user rule wins.
//! 4. LLM polish — still receives the dictionary and correction rules exactly
//!    as before and can repair anything the deterministic pass did not cover.

/// One mis-transcription pattern and its canonical spelling.
#[derive(Debug, Clone, Copy)]
pub struct TerminologyRule {
    /// Lowercase phrase the STT engine may produce. Must contain a space so it
    /// can only ever match multiple words.
    pub pattern: &'static str,
    /// Canonical spelling inserted in place of the matched phrase.
    pub canonical: &'static str,
}

/// Built-in developer terminology table.
///
/// Keep patterns lowercase and multi-word. Add new entries here rather than in
/// an i18n bundle so the correction is available to every user by default.
pub const TERMINOLOGY: &[TerminologyRule] = &[
    // Codex / OpenAI ecosystem
    TerminologyRule {
        pattern: "code x cli",
        canonical: "Codex CLI",
    },
    TerminologyRule {
        pattern: "code x",
        canonical: "Codex",
    },
    TerminologyRule {
        pattern: "open a i",
        canonical: "OpenAI",
    },
    TerminologyRule {
        pattern: "open ai",
        canonical: "OpenAI",
    },
    TerminologyRule {
        pattern: "chat g p t",
        canonical: "ChatGPT",
    },
    TerminologyRule {
        pattern: "chat gpt",
        canonical: "ChatGPT",
    },
    TerminologyRule {
        pattern: "g p t",
        canonical: "GPT",
    },
    TerminologyRule {
        pattern: "deep seek",
        canonical: "DeepSeek",
    },
    TerminologyRule {
        pattern: "open router",
        canonical: "OpenRouter",
    },
    // Claude / Anthropic
    TerminologyRule {
        pattern: "clawd code",
        canonical: "Claude Code",
    },
    TerminologyRule {
        pattern: "clawed code",
        canonical: "Claude Code",
    },
    // Speech / audio tooling
    TerminologyRule {
        pattern: "deep gram",
        canonical: "Deepgram",
    },
    TerminologyRule {
        pattern: "assembly a i",
        canonical: "AssemblyAI",
    },
    TerminologyRule {
        pattern: "assembly ai",
        canonical: "AssemblyAI",
    },
    TerminologyRule {
        pattern: "whisper cpp",
        canonical: "whisper.cpp",
    },
    // Languages / runtimes
    TerminologyRule {
        pattern: "pie thon",
        canonical: "Python",
    },
    TerminologyRule {
        pattern: "pi thon",
        canonical: "Python",
    },
    TerminologyRule {
        pattern: "type script",
        canonical: "TypeScript",
    },
    TerminologyRule {
        pattern: "java script",
        canonical: "JavaScript",
    },
    TerminologyRule {
        pattern: "node js",
        canonical: "Node.js",
    },
    TerminologyRule {
        pattern: "node j s",
        canonical: "Node.js",
    },
    TerminologyRule {
        pattern: "next js",
        canonical: "Next.js",
    },
    TerminologyRule {
        pattern: "express js",
        canonical: "Express.js",
    },
    TerminologyRule {
        pattern: "go lang",
        canonical: "Golang",
    },
    // Package managers
    TerminologyRule {
        pattern: "n p m",
        canonical: "npm",
    },
    TerminologyRule {
        pattern: "en p m",
        canonical: "npm",
    },
    TerminologyRule {
        pattern: "p n p m",
        canonical: "pnpm",
    },
    // Source control / editors
    TerminologyRule {
        pattern: "get hub copilot",
        canonical: "GitHub Copilot",
    },
    TerminologyRule {
        pattern: "git hub copilot",
        canonical: "GitHub Copilot",
    },
    TerminologyRule {
        pattern: "get hub",
        canonical: "GitHub",
    },
    TerminologyRule {
        pattern: "git hub",
        canonical: "GitHub",
    },
    TerminologyRule {
        pattern: "git lab",
        canonical: "GitLab",
    },
    TerminologyRule {
        pattern: "v s code",
        canonical: "VS Code",
    },
    TerminologyRule {
        pattern: "vs code",
        canonical: "VS Code",
    },
    // Infrastructure / data
    TerminologyRule {
        pattern: "cooper netties",
        canonical: "Kubernetes",
    },
    TerminologyRule {
        pattern: "cooper netes",
        canonical: "Kubernetes",
    },
    TerminologyRule {
        pattern: "kuber netes",
        canonical: "Kubernetes",
    },
    TerminologyRule {
        pattern: "kube control",
        canonical: "kubectl",
    },
    TerminologyRule {
        pattern: "cube control",
        canonical: "kubectl",
    },
    TerminologyRule {
        pattern: "postgres sequel",
        canonical: "PostgreSQL",
    },
    TerminologyRule {
        pattern: "postgres q l",
        canonical: "PostgreSQL",
    },
    TerminologyRule {
        pattern: "post gres",
        canonical: "Postgres",
    },
    TerminologyRule {
        pattern: "post gress",
        canonical: "Postgres",
    },
    TerminologyRule {
        pattern: "sequel lite",
        canonical: "SQLite",
    },
    TerminologyRule {
        pattern: "sequel light",
        canonical: "SQLite",
    },
    TerminologyRule {
        pattern: "s q lite",
        canonical: "SQLite",
    },
    // Frontend tooling
    TerminologyRule {
        pattern: "vite test",
        canonical: "Vitest",
    },
    TerminologyRule {
        pattern: "veet test",
        canonical: "Vitest",
    },
    TerminologyRule {
        pattern: "tail wind",
        canonical: "Tailwind",
    },
    TerminologyRule {
        pattern: "super base",
        canonical: "Supabase",
    },
    // Platforms / shells / services
    TerminologyRule {
        pattern: "mac o s",
        canonical: "macOS",
    },
    TerminologyRule {
        pattern: "mac oh s",
        canonical: "macOS",
    },
    TerminologyRule {
        pattern: "mac os",
        canonical: "macOS",
    },
    TerminologyRule {
        pattern: "power shell",
        canonical: "PowerShell",
    },
    TerminologyRule {
        pattern: "post man",
        canonical: "Postman",
    },
    TerminologyRule {
        pattern: "dot net",
        canonical: ".NET",
    },
    // Letter-by-letter acronyms
    TerminologyRule {
        pattern: "h t t p s",
        canonical: "HTTPS",
    },
    TerminologyRule {
        pattern: "h t t p",
        canonical: "HTTP",
    },
    TerminologyRule {
        pattern: "j s o n",
        canonical: "JSON",
    },
    TerminologyRule {
        pattern: "a p i",
        canonical: "API",
    },
    TerminologyRule {
        pattern: "c l i",
        canonical: "CLI",
    },
    TerminologyRule {
        pattern: "s d k",
        canonical: "SDK",
    },
    TerminologyRule {
        pattern: "l l m",
        canonical: "LLM",
    },
    TerminologyRule {
        pattern: "h t m l",
        canonical: "HTML",
    },
    TerminologyRule {
        pattern: "c s s",
        canonical: "CSS",
    },
    TerminologyRule {
        pattern: "s q l",
        canonical: "SQL",
    },
    TerminologyRule {
        pattern: "u r l",
        canonical: "URL",
    },
];

const MAX_DETERMINISTIC_CORRECTIONS: usize = 100;

#[derive(Debug, Clone)]
struct CompiledRule {
    pattern_tokens: Vec<String>,
    replacement: String,
    excluded: bool,
}

impl CompiledRule {
    fn new(pattern: &str, replacement: String, excluded: bool) -> Self {
        let pattern_tokens = pattern
            .split_whitespace()
            .map(|token| token.to_lowercase())
            .collect::<Vec<_>>();
        Self {
            pattern_tokens,
            replacement,
            excluded,
        }
    }

    fn token_count(&self) -> usize {
        self.pattern_tokens.len()
    }
}

/// Apply only the built-in developer terminology table.
///
/// This is the pure entry point used by tests and by callers that do not have
/// user dictionary / correction data at hand.
pub fn apply_terminology(text: &str) -> String {
    apply_builtin(text, &[], &[])
}

/// Final deterministic transcript pass, run before LLM polish.
///
/// Order:
/// 1. built-in terminology (unless disabled), skipping patterns claimed by a
///    user correction rule and honouring user dictionary spelling;
/// 2. enabled user correction rules, applied deterministically.
///
/// Applying user corrections last means they always win over the built-in
/// table even if a user rule targets a term the table would otherwise rewrite.
pub fn finalize_transcript<'a>(
    text: &str,
    developer_terms_enabled: bool,
    dictionary_words: &[String],
    correction_rules: impl IntoIterator<Item = (&'a str, &'a str, bool)>,
) -> String {
    let active_corrections = correction_rules
        .into_iter()
        .filter(|(pattern, replacement, enabled)| {
            *enabled && !pattern.trim().is_empty() && !replacement.trim().is_empty()
        })
        .take(MAX_DETERMINISTIC_CORRECTIONS)
        .collect::<Vec<_>>();

    // A user correction rule claims its pattern: the built-in table must not
    // rewrite that phrase first, or the user rule would have nothing left to
    // match. Without this, `codex -> CodEx` would never see `code x`, because
    // the built-in pass would already have produced `Codex`.
    let overridden_patterns = active_corrections
        .iter()
        .map(|(pattern, _, _)| normalized_phrase(pattern))
        .collect::<Vec<_>>();

    let mut text = if developer_terms_enabled {
        apply_builtin(text, dictionary_words, &overridden_patterns)
    } else {
        text.to_string()
    };

    let rules = active_corrections
        .iter()
        .map(|(pattern, replacement, _)| {
            CompiledRule::new(pattern, (*replacement).to_string(), false)
        })
        .collect::<Vec<_>>();
    text = apply_rules(&text, &rules);
    text
}

fn normalized_phrase(value: &str) -> String {
    value
        .split_whitespace()
        .map(|token| token.to_lowercase())
        .collect::<Vec<_>>()
        .join(" ")
}

fn apply_builtin(
    text: &str,
    dictionary_words: &[String],
    overridden_patterns: &[String],
) -> String {
    let rules = TERMINOLOGY
        .iter()
        .map(|rule| {
            let excluded = overridden_patterns
                .iter()
                .any(|pattern| *pattern == normalized_phrase(rule.pattern));
            CompiledRule::new(
                rule.pattern,
                canonical_with_dictionary(rule.canonical, dictionary_words),
                excluded,
            )
        })
        .collect::<Vec<_>>();
    apply_rules(text, &rules)
}

/// The user dictionary is authoritative for spelling. If it lists a word that
/// only differs in case from the built-in canonical term, keep the user's
/// spelling (`CodeX` stays `CodeX`, not `Codex`).
fn canonical_with_dictionary(canonical: &str, dictionary_words: &[String]) -> String {
    dictionary_words
        .iter()
        .map(|word| word.trim())
        .find(|word| word.eq_ignore_ascii_case(canonical))
        .map(str::to_string)
        .unwrap_or_else(|| canonical.to_string())
}

fn is_word_char(character: char) -> bool {
    character.is_alphanumeric() || character == '_'
}

/// Characters that glue technical tokens together. A phrase must not match
/// across them, so `code x-ray` never becomes `Codex-ray`.
fn is_token_joiner(character: char) -> bool {
    matches!(character, '-' | '_' | '.' | '@' | '/' | '+')
}

fn word_tokens(text: &str) -> Vec<(usize, usize)> {
    let mut tokens = Vec::new();
    let mut start: Option<usize> = None;
    for (index, character) in text.char_indices() {
        if is_word_char(character) {
            start.get_or_insert(index);
        } else if let Some(token_start) = start.take() {
            tokens.push((token_start, index));
        }
    }
    if let Some(token_start) = start {
        tokens.push((token_start, text.len()));
    }
    tokens
}

/// True when `character` glues this match to another word.
///
/// A joiner only disqualifies a match when it is itself wedged between two
/// word characters (`code-x`, `hub.bash`). Punctuation at a sentence edge
/// (`Get Hub.`, `(code x)`) is not a joiner, so the phrase still matches.
fn glued_to_word(joiner: char, neighbour: Option<char>) -> bool {
    is_token_joiner(joiner) && neighbour.is_some_and(is_word_char)
}

fn matches_at(
    text: &str,
    tokens: &[(usize, usize)],
    index: usize,
    pattern_tokens: &[String],
) -> Option<usize> {
    let count = pattern_tokens.len();
    if count == 0 || index + count > tokens.len() {
        return None;
    }
    for offset in 0..count {
        let (start, end) = tokens[index + offset];
        if !text[start..end].eq_ignore_ascii_case(&pattern_tokens[offset]) {
            return None;
        }
        if offset > 0 {
            let previous_end = tokens[index + offset - 1].1;
            if previous_end >= start || !text[previous_end..start].chars().all(char::is_whitespace)
            {
                return None;
            }
        }
    }

    let (start, end) = (tokens[index].0, tokens[index + count - 1].1);
    let prefix = &text[..start];
    if let Some(joiner) = prefix.chars().next_back() {
        let before = prefix.len() - joiner.len_utf8();
        if glued_to_word(joiner, prefix[..before].chars().next_back()) {
            return None;
        }
    }
    let suffix = &text[end..];
    if let Some(joiner) = suffix.chars().next() {
        if glued_to_word(joiner, suffix[joiner.len_utf8()..].chars().next()) {
            return None;
        }
    }
    Some(count)
}

fn apply_rules(text: &str, rules: &[CompiledRule]) -> String {
    if rules.is_empty() || text.is_empty() {
        return text.to_string();
    }
    let active = rules
        .iter()
        .filter(|rule| !rule.excluded && rule.token_count() > 0)
        .collect::<Vec<_>>();
    if active.is_empty() {
        return text.to_string();
    }

    let tokens = word_tokens(text);
    let mut output = String::with_capacity(text.len());
    let mut cursor = 0usize;
    let mut index = 0usize;
    while index < tokens.len() {
        let mut best: Option<(&CompiledRule, usize)> = None;
        for rule in &active {
            if let Some(count) = matches_at(text, &tokens, index, &rule.pattern_tokens) {
                let is_longer = best.is_none_or(|(current, _)| count > current.token_count());
                if is_longer {
                    best = Some((rule, count));
                }
            }
        }

        match best {
            Some((rule, count)) => {
                let start = tokens[index].0;
                let end = tokens[index + count - 1].1;
                output.push_str(&text[cursor..start]);
                output.push_str(&rule.replacement);
                cursor = end;
                index += count;
            }
            None => index += 1,
        }
    }
    output.push_str(&text[cursor..]);
    output
}

#[cfg(test)]
mod tests {
    use super::*;

    /// (pattern, replacement, enabled) — the shape both the pipeline and Ask use.
    fn user_rule(pattern: &str, replacement: &str) -> (String, String, bool) {
        (pattern.to_string(), replacement.to_string(), true)
    }

    fn finalize(text: &str, enabled: bool, rules: &[(String, String, bool)]) -> String {
        finalize_transcript(
            text,
            enabled,
            &[],
            rules.iter().map(|(p, r, on)| (p.as_str(), r.as_str(), *on)),
        )
    }

    #[test]
    fn code_x_becomes_codex() {
        assert_eq!(apply_terminology("code x"), "Codex");
        assert_eq!(
            apply_terminology("I tried Code X yesterday."),
            "I tried Codex yesterday."
        );
    }

    #[test]
    fn code_x_cli_prefers_the_longer_match() {
        assert_eq!(apply_terminology("code x cli"), "Codex CLI");
        assert_eq!(
            apply_terminology("Open code x cli and run it."),
            "Open Codex CLI and run it."
        );
    }

    #[test]
    fn get_hub_becomes_github() {
        assert_eq!(apply_terminology("get hub"), "GitHub");
        assert_eq!(
            apply_terminology("push it to Get Hub."),
            "push it to GitHub."
        );
    }

    #[test]
    fn ordinary_single_words_are_never_touched() {
        let prose = "The code is fine; press x to continue. A single x and code stay as they are.";
        assert_eq!(apply_terminology(prose), prose);

        // A split token glued with a joiner must not match either.
        assert_eq!(apply_terminology("code x-ray"), "code x-ray");
        assert_eq!(apply_terminology("the code, x and y"), "the code, x and y");
    }

    #[test]
    fn longer_builtin_matches_win_over_prefixes() {
        assert_eq!(apply_terminology("h t t p s request"), "HTTPS request");
        assert_eq!(apply_terminology("chat g p t"), "ChatGPT");
        assert_eq!(apply_terminology("p n p m install"), "pnpm install");
    }

    #[test]
    fn user_dictionary_spelling_beats_builtin_canonical() {
        let dictionary = vec!["CodeX".to_string()];
        assert_eq!(
            finalize_transcript("code x", true, &dictionary, std::iter::empty()),
            "CodeX"
        );
    }

    #[test]
    fn user_correction_rule_overrides_builtin_terminology() {
        let rule = user_rule("code x", "CodEx");
        assert_eq!(finalize("code x", true, &[rule]), "CodEx");
    }

    #[test]
    fn user_corrections_apply_even_when_targeted_at_canonical_form() {
        let rule = user_rule("codex", "CodEx");
        assert_eq!(finalize("code x", true, &[rule]), "CodEx");
    }

    #[test]
    fn disabled_rule_is_not_applied() {
        let mut rule = user_rule("code x", "CodEx");
        rule.2 = false;
        assert_eq!(finalize("code x", true, &[rule]), "Codex");
    }

    #[test]
    fn toggle_off_disables_builtin_terminology() {
        assert_eq!(
            finalize_transcript("code x and get hub", false, &[], std::iter::empty()),
            "code x and get hub"
        );
    }

    #[test]
    fn toggle_off_still_applies_user_corrections() {
        let rule = user_rule("code x", "CodEx");
        assert_eq!(finalize("code x", false, &[rule]), "CodEx");
    }
}
