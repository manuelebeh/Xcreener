use std::io::Write;
use std::process::{Command, Stdio};

use super::OcrEngine;
use crate::ocr::types::TextLine;

pub struct TesseractOcrEngine {
    tessdata_dir: Option<String>,
}

impl TesseractOcrEngine {
    pub fn new(tessdata_dir: Option<String>) -> Self {
        Self { tessdata_dir }
    }
}

impl OcrEngine for TesseractOcrEngine {
    fn recognize_with_languages(
        &self,
        png_bytes: &[u8],
        languages: &[String],
    ) -> Result<Vec<TextLine>, String> {
        let decoded = image::load_from_memory(png_bytes).map_err(|error| error.to_string())?;
        let rgba = decoded.to_rgba8();
        let (image_width, image_height) = rgba.dimensions();

        let lang = if languages.is_empty() {
            "eng".to_string()
        } else {
            languages.join("+")
        };

        let mut temp_file = tempfile::NamedTempFile::new().map_err(|error| error.to_string())?;
        temp_file
            .write_all(png_bytes)
            .map_err(|error| error.to_string())?;
        let input_path = temp_file.path();

        let mut command = Command::new("tesseract");
        command
            .arg(input_path)
            .arg("stdout")
            .arg("-l")
            .arg(lang)
            .arg("tsv")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());

        if let Some(tessdata_dir) = &self.tessdata_dir {
            command.env("TESSDATA_PREFIX", tessdata_dir);
        }

        let output = command
            .output()
            .map_err(|error| format!("Failed to run tesseract CLI: {error}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!(
                "Tesseract OCR failed. Install tesseract (e.g. brew install tesseract) or use native engine. {stderr}"
            ));
        }

        let stdout = String::from_utf8_lossy(&output.stdout);
        parse_tesseract_tsv(&stdout, image_width, image_height)
    }

    fn recognize(&self, png_bytes: &[u8]) -> Result<Vec<TextLine>, String> {
        self.recognize_with_languages(png_bytes, &["eng".to_string()])
    }
}

fn parse_tesseract_tsv(
    tsv: &str,
    image_width: u32,
    image_height: u32,
) -> Result<Vec<TextLine>, String> {
    let mut line_map: Vec<(i32, TextLine)> = Vec::new();

    for row in tsv.lines().skip(1) {
        let columns: Vec<&str> = row.split('\t').collect();
        if columns.len() < 12 {
            continue;
        }

        let level = columns[0].parse::<i32>().unwrap_or(-1);
        if level != 4 {
            continue;
        }

        let line_num = columns[4].parse::<i32>().unwrap_or(-1);
        let left = columns[6].parse::<f64>().unwrap_or(0.0);
        let top = columns[7].parse::<f64>().unwrap_or(0.0);
        let width = columns[8].parse::<f64>().unwrap_or(0.0);
        let height = columns[9].parse::<f64>().unwrap_or(0.0);
        let text = columns[11].trim().to_string();

        if text.is_empty() {
            continue;
        }

        if let Some((existing_line_num, existing)) =
            line_map.iter_mut().find(|(num, _)| *num == line_num)
        {
            existing.text.push(' ');
            existing.text.push_str(&text);
            existing.width = (left + width - existing.x).max(existing.width);
            existing.height = existing.height.max(height);
            let _ = existing_line_num;
        } else {
            line_map.push((
                line_num,
                TextLine {
                    text,
                    x: left,
                    y: top,
                    width: width.max(1.0),
                    height: height.max(12.0),
                },
            ));
        }
    }

    let mut lines: Vec<TextLine> = line_map.into_iter().map(|(_, line)| line).collect();
    lines.sort_by(|a, b| {
        a.y
            .partial_cmp(&b.y)
            .unwrap_or(std::cmp::Ordering::Equal)
            .then_with(|| {
                a.x
                    .partial_cmp(&b.x)
                    .unwrap_or(std::cmp::Ordering::Equal)
            })
    });

    if lines.is_empty() {
        return Ok(Vec::new());
    }

    for line in &mut lines {
        line.x = line.x.clamp(0.0, image_width as f64);
        line.y = line.y.clamp(0.0, image_height as f64);
        line.width = line.width.clamp(1.0, image_width as f64 - line.x);
        line.height = line.height.clamp(12.0, image_height as f64 - line.y);
    }

    Ok(lines)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_tesseract_tsv_lines() {
        let tsv = "level\tpage_num\tblock_num\tpar_num\tline_num\tword_num\tleft\ttop\twidth\theight\tconf\ttext\n\
4\t1\t1\t1\t1\t1\t10\t20\t100\t12\t95\tHello\n\
4\t1\t1\t1\t1\t2\t120\t20\t40\t12\t95\tworld\n\
4\t1\t1\t1\t2\t3\t10\t40\t80\t12\t95\tSecond\n";

        let lines = parse_tesseract_tsv(tsv, 400, 300).expect("parse tsv");
        assert_eq!(lines.len(), 2);
        assert_eq!(lines[0].text, "Hello world");
        assert_eq!(lines[1].text, "Second");
    }
}
