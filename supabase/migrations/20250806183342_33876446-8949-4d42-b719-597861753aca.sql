-- Create profiles table
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create recordings table
CREATE TABLE public.recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text,
  audio_url text,
  transcription text,
  summary text,
  sentiment text,
  tags text[],
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create highlights table
CREATE TABLE public.highlights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recording_id uuid REFERENCES recordings(id) ON DELETE CASCADE NOT NULL,
  timestamp_seconds integer,
  content text
);

-- Create knowledge_graph table
CREATE TABLE public.knowledge_graph (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text NOT NULL,
  linked_tags text[]
);

-- Create folders table
CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create folder_recordings table
CREATE TABLE public.folder_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  folder_id uuid REFERENCES folders(id) ON DELETE CASCADE NOT NULL,
  recording_id uuid REFERENCES recordings(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(folder_id, recording_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_graph ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folder_recordings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Recordings policies
CREATE POLICY "Users can view their own recordings" ON public.recordings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recordings" ON public.recordings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recordings" ON public.recordings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recordings" ON public.recordings
  FOR DELETE USING (auth.uid() = user_id);

-- Highlights policies (access through recording ownership)
CREATE POLICY "Users can view highlights of their recordings" ON public.highlights
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM recordings 
      WHERE recordings.id = highlights.recording_id 
      AND recordings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create highlights for their recordings" ON public.highlights
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM recordings 
      WHERE recordings.id = highlights.recording_id 
      AND recordings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update highlights of their recordings" ON public.highlights
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM recordings 
      WHERE recordings.id = highlights.recording_id 
      AND recordings.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete highlights of their recordings" ON public.highlights
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM recordings 
      WHERE recordings.id = highlights.recording_id 
      AND recordings.user_id = auth.uid()
    )
  );

-- Knowledge graph policies (public read, admin write)
CREATE POLICY "Everyone can view knowledge graph" ON public.knowledge_graph
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can manage knowledge graph" ON public.knowledge_graph
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Folders policies
CREATE POLICY "Users can view their own folders" ON public.folders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own folders" ON public.folders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own folders" ON public.folders
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own folders" ON public.folders
  FOR DELETE USING (auth.uid() = user_id);

-- Folder recordings policies (access through folder ownership)
CREATE POLICY "Users can view their folder recordings" ON public.folder_recordings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM folders 
      WHERE folders.id = folder_recordings.folder_id 
      AND folders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their folder recordings" ON public.folder_recordings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM folders 
      WHERE folders.id = folder_recordings.folder_id 
      AND folders.user_id = auth.uid()
    )
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
END;
$$;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();