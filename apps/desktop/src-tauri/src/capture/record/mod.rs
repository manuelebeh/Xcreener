pub mod encode_gif;
pub mod encode_mp4;

pub(crate) mod control;
mod session;

pub use session::{
    cancel_region_recording, pause_region_recording, resume_region_recording,
    start_region_recording, stop_region_recording,
};
