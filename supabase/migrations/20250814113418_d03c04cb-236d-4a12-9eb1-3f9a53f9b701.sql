-- Fix storage policy for uploading recordings
DROP POLICY "Users can upload their own recordings" ON storage.objects;

CREATE POLICY "Users can upload their own recordings" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'recordings' AND auth.uid()::text = (storage.foldername(name))[1]);