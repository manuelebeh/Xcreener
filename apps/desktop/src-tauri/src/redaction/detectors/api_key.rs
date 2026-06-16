use regex::Regex;
use std::sync::LazyLock;

use super::super::types::{SensitiveRegion, TextLine};
use super::region_for_match;

static API_KEY_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)\b(?:sk|pk|api|key|token|secret|password)[a-zA-Z0-9_-]{10,}\b").unwrap()
});

pub fn detect(line: &TextLine) -> Vec<SensitiveRegion> {
    API_KEY_RE
        .find_iter(&line.text)
        .map(|matched| region_for_match(line, matched.start(), matched.end(), "api_key", 4.0))
        .collect()
}
