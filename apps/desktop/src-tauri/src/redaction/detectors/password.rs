use regex::Regex;
use std::sync::LazyLock;

use super::super::types::{SensitiveRegion, TextLine};
use super::region_for_match;

static PASSWORD_CONTEXT_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)(?:password|passwd|secret|mot de passe)\s*[:=]\s*(\S{6,})").unwrap()
});

pub fn detect(line: &TextLine) -> Vec<SensitiveRegion> {
    PASSWORD_CONTEXT_RE
        .captures_iter(&line.text)
        .filter_map(|capture| {
            let matched = capture.get(1)?;
            Some(region_for_match(
                line,
                matched.start(),
                matched.end(),
                "password",
                4.0,
            ))
        })
        .collect()
}
