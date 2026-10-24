-- 2026-10-24 audit FINDING-008: the numeric id is per installation, so it cannot identify a
-- capture across devices. `uid` is the id sent to the cloud library as `localId`.

ALTER TABLE captures ADD COLUMN uid TEXT;

UPDATE captures SET uid = lower(hex(randomblob(16))) WHERE uid IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_captures_uid ON captures(uid);
