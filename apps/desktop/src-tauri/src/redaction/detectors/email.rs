use regex::Regex;
use std::sync::LazyLock;

use super::super::types::{SensitiveRegion, TextLine};
use super::region_for_match;

static EMAIL_RE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").unwrap());

pub fn detect(line: &TextLine) -> Vec<SensitiveRegion> {
    EMAIL_RE
        .find_iter(&line.text)
        .map(|matched| region_for_match(line, matched.start(), matched.end(), "email", 4.0))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_standard_email() {
        let line = TextLine {
            text: "Email me at alice@company.co.uk today".to_string(),
            x: 10.0,
            y: 20.0,
            width: 360.0,
            height: 18.0,
        };
        let regions = detect(&line);
        assert_eq!(regions.len(), 1);
        assert_eq!(regions[0].kind, "email");
    }
}
