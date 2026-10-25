use crate::redaction::detectors;
use crate::redaction::types::TextLine;

fn line(text: &str) -> TextLine {
    TextLine {
        text: text.to_string(),
        x: 0.0,
        y: 0.0,
        width: text.len() as f64 * 10.0,
        height: 20.0,
    }
}

#[test]
fn recall_on_detector_corpus() {
    let corpus = [
        ("Contact user@example.com", vec!["email"]),
        ("Phone 06 12 34 56 78", vec!["phone"]),
        ("Card 4111 1111 1111 1111", vec!["card"]),
        ("sk_live_abcdefghijklmnopqrstuvwxyz", vec!["api_key"]),
        ("https://api.example.com?token=secret123", vec!["url"]),
        ("password: hunter2", vec!["password"]),
        ("Email alice@company.co.uk", vec!["email"]),
        ("secret: my-long-secret-value", vec!["password"]),
        ("Call 555-123-4567", vec!["phone"]),
        ("No sensitive content here", vec![]),
    ];

    let mut expected = 0usize;
    let mut found = 0usize;

    for (text, kinds) in corpus {
        let regions = detectors::detect_in_lines(&[line(text)]);
        expected += kinds.len();
        for kind in kinds {
            if regions.iter().any(|region| region.kind == kind) {
                found += 1;
            }
        }
    }

    let recall = found as f64 / expected as f64;
    assert!(
        recall >= 0.9,
        "expected recall >= 90%, got {recall:.0}% ({found}/{expected})"
    );
}
