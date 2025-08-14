-- Update recordings bucket to be public so audio files can be accessed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'recordings';

-- Add duration column to recordings table
ALTER TABLE recordings 
ADD COLUMN duration_seconds integer;

-- Add duration_formatted column for display purposes  
ALTER TABLE recordings 
ADD COLUMN duration_formatted text;