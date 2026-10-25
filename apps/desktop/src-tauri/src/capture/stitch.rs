use image::RgbaImage;

const DEFAULT_SEARCH_ROWS: u32 = 120;
const MIN_OVERLAP: u32 = 8;

/// Row sum of absolute RGB differences (fast overlap metric).
fn row_distance(a: &[u8], b: &[u8]) -> u64 {
    a.as_chunks::<4>()
        .0
        .iter()
        .zip(b.as_chunks::<4>().0.iter())
        .map(|(left, right)| {
            (i32::from(left[0]) - i32::from(right[0])).unsigned_abs() as u64
                + (i32::from(left[1]) - i32::from(right[1])).unsigned_abs() as u64
                + (i32::from(left[2]) - i32::from(right[2])).unsigned_abs() as u64
        })
        .sum()
}

fn row_at(image: &RgbaImage, y: u32) -> &[u8] {
    let width = image.width() as usize;
    let start = (y as usize) * width * 4;
    &image.as_raw()[start..start + width * 4]
}

/// Find vertical overlap between bottom of `previous` and top of `next`.
pub fn find_vertical_overlap(
    previous: &RgbaImage,
    next: &RgbaImage,
    max_search_rows: u32,
) -> Option<u32> {
    if previous.width() != next.width() {
        return None;
    }

    let prev_h = previous.height();
    let next_h = next.height();
    if prev_h == 0 || next_h == 0 {
        return None;
    }

    let search = max_search_rows.min(prev_h).min(next_h);
    let mut best_overlap = None;
    let mut best_score = u64::MAX;

    for overlap in MIN_OVERLAP..=search {
        let mut score = 0u64;
        for row in 0..overlap {
            let prev_y = prev_h - overlap + row;
            score += row_distance(row_at(previous, prev_y), row_at(next, row));
        }

        if score < best_score {
            best_score = score;
            best_overlap = Some(overlap);
        }
    }

    best_overlap
}

/// Append non-overlapping portion of `next` below `previous`.
pub fn append_scrolled_frame(
    previous: &RgbaImage,
    next: &RgbaImage,
) -> Result<(RgbaImage, bool), String> {
    let overlap = find_vertical_overlap(previous, next, DEFAULT_SEARCH_ROWS)
        .ok_or_else(|| "unable to find vertical overlap".to_string())?;

    let width = previous.width();
    let append_start = overlap;
    let append_height = next.height().saturating_sub(append_start);
    if append_height == 0 {
        return Ok((previous.clone(), false));
    }

    let mut canvas = RgbaImage::new(width, previous.height() + append_height);
    for y in 0..previous.height() {
        for x in 0..width {
            canvas.put_pixel(x, y, *previous.get_pixel(x, y));
        }
    }

    for y in 0..append_height {
        for x in 0..width {
            canvas.put_pixel(
                x,
                previous.height() + y,
                *next.get_pixel(x, append_start + y),
            );
        }
    }

    Ok((canvas, true))
}

pub fn frames_identical(a: &RgbaImage, b: &RgbaImage) -> bool {
    a.width() == b.width() && a.height() == b.height() && a.as_raw() == b.as_raw()
}

#[cfg(test)]
mod tests {
    use super::*;
    use image::Rgba;

    fn solid_image(width: u32, height: u32, color: Rgba<u8>) -> RgbaImage {
        RgbaImage::from_pixel(width, height, color)
    }

    fn gradient_image(width: u32, height: u32, start: u8) -> RgbaImage {
        let mut image = RgbaImage::new(width, height);
        for y in 0..height {
            let value = start.wrapping_add(y as u8);
            for x in 0..width {
                image.put_pixel(x, y, Rgba([value, value, value, 255]));
            }
        }
        image
    }

    #[test]
    fn finds_known_overlap() {
        let width = 40;
        let overlap = 20;
        let previous = gradient_image(width, 60, 0);
        let mut next = gradient_image(width, 60, 40);

        for y in 0..overlap {
            for x in 0..width {
                let pixel = *previous.get_pixel(x, 60 - overlap + y);
                next.put_pixel(x, y, pixel);
            }
        }

        assert_eq!(find_vertical_overlap(&previous, &next, 40), Some(overlap));
    }

    #[test]
    fn append_extends_canvas_height() {
        let previous = gradient_image(10, 30, 0);
        let mut next = gradient_image(10, 30, 20);
        for y in 0..10 {
            for x in 0..10 {
                next.put_pixel(x, y, *previous.get_pixel(x, 20 + y));
            }
        }

        let (stitched, appended) = append_scrolled_frame(&previous, &next).expect("stitch");
        assert!(appended);
        assert_eq!(stitched.height(), 50);
    }

    #[test]
    fn identical_frames_do_not_append() {
        let frame = solid_image(8, 8, Rgba([10, 20, 30, 255]));
        let (stitched, appended) = append_scrolled_frame(&frame, &frame).expect("stitch");
        assert!(!appended);
        assert_eq!(stitched.height(), frame.height());
    }
}
