mod api_key;
mod card;
mod email;
mod password;
mod phone;
mod url;

#[cfg(test)]
mod recall_test;

use crate::redaction::types::{SensitiveRegion, TextLine};

pub fn detect_in_lines(lines: &[TextLine]) -> Vec<SensitiveRegion> {
    let mut regions = Vec::new();

    for line in lines {
        regions.extend(email::detect(line));
        regions.extend(phone::detect(line));
        regions.extend(card::detect(line));
        regions.extend(api_key::detect(line));
        regions.extend(url::detect(line));
        regions.extend(password::detect(line));
    }

    merge_overlapping(regions)
}

fn merge_overlapping(mut regions: Vec<SensitiveRegion>) -> Vec<SensitiveRegion> {
    if regions.len() < 2 {
        return regions;
    }

    regions.sort_by(|a, b| {
        a.kind
            .cmp(&b.kind)
            .then(a.x.partial_cmp(&b.x).unwrap_or(std::cmp::Ordering::Equal))
    });

    let mut merged: Vec<SensitiveRegion> = Vec::new();

    for region in regions {
        if let Some(last) = merged.last_mut() {
            if last.kind == region.kind && overlaps(last, &region) {
                expand_to_include(last, &region);
                continue;
            }
        }
        merged.push(region);
    }

    merged
}

fn overlaps(a: &SensitiveRegion, b: &SensitiveRegion) -> bool {
    let ax2 = a.x + a.width;
    let ay2 = a.y + a.height;
    let bx2 = b.x + b.width;
    let by2 = b.y + b.height;

    a.x < bx2 && ax2 > b.x && a.y < by2 && ay2 > b.y
}

fn expand_to_include(target: &mut SensitiveRegion, other: &SensitiveRegion) {
    let x2 = (target.x + target.width).max(other.x + other.width);
    let y2 = (target.y + target.height).max(other.y + other.height);
    target.x = target.x.min(other.x);
    target.y = target.y.min(other.y);
    target.width = x2 - target.x;
    target.height = y2 - target.y;
}

pub fn region_for_match(
    line: &TextLine,
    start: usize,
    end: usize,
    kind: &str,
    padding: f64,
) -> SensitiveRegion {
    let chars = line.text.chars().count().max(1) as f64;
    let start_index = line.text[..start].chars().count() as f64;
    let match_len = line.text[start..end].chars().count() as f64;
    let char_width = line.width / chars;
    let x = line.x + start_index * char_width;
    let width = match_len * char_width;

    SensitiveRegion {
        x: (x - padding).max(0.0),
        y: (line.y - padding).max(0.0),
        width: width + padding * 2.0,
        height: line.height + padding * 2.0,
        kind: kind.to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn line(text: &str) -> TextLine {
        TextLine {
            text: text.to_string(),
            x: 0.0,
            y: 0.0,
            width: text.chars().count() as f64 * 10.0,
            height: 20.0,
        }
    }

    #[test]
    fn detects_email_phone_and_api_key() {
        let lines = vec![
            line("Contact: user@example.com"),
            line("Phone: 06 12 34 56 78"),
            line("Key: sk_live_abcdefghijklmnopqrstuvwxyz"),
        ];

        let regions = detect_in_lines(&lines);
        let kinds: Vec<_> = regions.iter().map(|region| region.kind.as_str()).collect();

        assert!(kinds.contains(&"email"));
        assert!(kinds.contains(&"phone"));
        assert!(kinds.contains(&"api_key"));
    }
}
