use regex::Regex;
use std::sync::LazyLock;

use super::super::types::{SensitiveRegion, TextLine};
use super::region_for_match;

static PHONE_RE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(
        r"(?x)
        (?:
            (?:\+|00)[1-9]\d{0,2}[\s.-]?
        )?
        (?:
            \(?\d{2,4}\)?[\s.-]?
        )?
        (?:\d[\s().-]*){7,}\d
    ",
    )
    .unwrap()
});

pub fn detect(line: &TextLine) -> Vec<SensitiveRegion> {
    PHONE_RE
        .find_iter(&line.text)
        .filter(|matched| {
            matched
                .as_str()
                .chars()
                .filter(|ch| ch.is_ascii_digit())
                .count()
                >= 8
        })
        .map(|matched| region_for_match(line, matched.start(), matched.end(), "phone", 4.0))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_french_and_us_phone_numbers() {
        for text in ["Phone 06 12 34 56 78", "Call 555-123-4567"] {
            let line = TextLine {
                text: text.to_string(),
                x: 0.0,
                y: 0.0,
                width: 240.0,
                height: 20.0,
            };
            assert!(!detect(&line).is_empty(), "expected phone in {text}");
        }
    }
}
