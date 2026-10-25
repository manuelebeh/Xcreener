use regex::Regex;
use std::sync::LazyLock;

use super::super::types::{SensitiveRegion, TextLine};
use super::region_for_match;

static CARD_RE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\b(?:\d[ -]*?){13,19}\b").unwrap());

pub fn detect(line: &TextLine) -> Vec<SensitiveRegion> {
    CARD_RE
        .find_iter(&line.text)
        .filter(|matched| luhn_valid(matched.as_str()))
        .map(|matched| region_for_match(line, matched.start(), matched.end(), "card", 6.0))
        .collect()
}

fn luhn_valid(value: &str) -> bool {
    let digits: Vec<u32> = value
        .chars()
        .filter(|ch| ch.is_ascii_digit())
        .map(|ch| ch.to_digit(10).unwrap_or(0))
        .collect();

    if digits.len() < 13 || digits.len() > 19 {
        return false;
    }

    let mut sum = 0;
    let mut double = false;

    for digit in digits.iter().rev() {
        let mut current = *digit;
        if double {
            current *= 2;
            if current > 9 {
                current -= 9;
            }
        }
        sum += current;
        double = !double;
    }

    sum % 10 == 0
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_known_test_card() {
        let line = super::super::super::types::TextLine {
            text: "Card 4111 1111 1111 1111".to_string(),
            x: 0.0,
            y: 0.0,
            width: 240.0,
            height: 20.0,
        };
        assert_eq!(detect(&line).len(), 1);
    }
}
