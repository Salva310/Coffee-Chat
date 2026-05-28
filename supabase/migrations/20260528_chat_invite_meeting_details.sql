-- Add meeting-detail columns to chat_invites so the invite carries all scheduling info.
-- The meetings row is created only on acceptance (status = 'accepted').

ALTER TABLE chat_invites
  ADD COLUMN IF NOT EXISTS proposed_at       TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS duration_minutes  INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS meeting_type      TEXT DEFAULT 'video',
  ADD COLUMN IF NOT EXISTS meeting_url       TEXT,
  ADD COLUMN IF NOT EXISTS phone             TEXT,
  ADD COLUMN IF NOT EXISTS location          TEXT;
