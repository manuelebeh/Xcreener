use regex::Regex;
use std::sync::LazyLock;

use super::super::types::{SensitiveRegion, TextLine};
use super::region_for_match;

static SENSITIVE_URL_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"https?://[^\s]*(?:token|key|secret|password|auth)[^\s]*"#).unwrap()
});

pub fn detect(line: &TextLine) -> Vec<SensitiveRegion> {
    SENSITIVE_URL_RE
        .find_iter(&line.text)
        .map(|matched| region_for_match(line, matched.start(), matched.end(), "url", 4.0))
        .collect()
}
