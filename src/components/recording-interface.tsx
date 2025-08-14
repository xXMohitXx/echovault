import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Mic, Square, Pause, Play, Save, Trash2, Loader2 } from "lucide-react";
import { Waveform } from "@/components/ui/waveform";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function RecordingInterface() {
  const [title, setTitle] = useState("New Recording");
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    isRecording,
    isPaused,
    duration,
    startRecording,
    pauseRecording,
    stopRecording,
    audioBlob
  } = useAudioRecorder();

  const handleRecord = async () => {
    try {
      await startRecording();
    } catch (error) {
      console.error('Recording error:', error);
    }
  };

  const handlePause = () => {
    pauseRecording();
  };

  const handleStop = async () => {
    const url = await stopRecording();
    setAudioUrl(url);
  };

  const handleDiscard = () => {
    setAudioUrl(null);
    setTitle("New Recording");
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  const handleSaveAndTranscribe = async () => {
    if (!audioBlob || !user) return;

    setIsProcessing(true);
    
    try {
      // Upload audio to Supabase Storage
      const fileName = `${user.id}/${Date.now()}.webm`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('recordings')
        .upload(fileName, audioBlob);

      if (uploadError) throw uploadError;

      // Get the public URL
      const { data: { publicUrl } } = supabase.storage
        .from('recordings')
        .getPublicUrl(fileName);

      // Convert audio blob to base64 for transcription
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          console.log('Starting transcription with audio size:', base64Audio.length);
          
          // Call transcription function
          const { data: transcriptionData, error: transcriptionError } = await supabase.functions
            .invoke('transcribe-audio', {
              body: { audio: base64Audio }
            });

          console.log('Transcription response:', { transcriptionData, transcriptionError });
          
          // Check if we got data even if there's an "error"
          if (transcriptionData?.text) {
            console.log('Transcription successful:', transcriptionData.text);
          } else if (transcriptionError) {
            console.error('Transcription error details:', transcriptionError);
            throw new Error(`Transcription failed: ${transcriptionError.message || 'Unknown transcription error'}`);
          } else {
            throw new Error('No transcription text received from the API');
          }

          console.log('Starting analysis with text:', transcriptionData.text);
          // Call analysis function
          const { data: analysisData, error: analysisError } = await supabase.functions
            .invoke('analyze-recording', {
              body: { text: transcriptionData.text }
            });

          console.log('Analysis response:', { analysisData, analysisError });
          
          // Check if we got data even if there's an "error"  
          if (analysisData?.summary) {
            console.log('Analysis successful');
          } else if (analysisError) {
            console.error('Analysis error details:', analysisError);
            throw new Error(`Analysis failed: ${analysisError.message || 'Unknown analysis error'}`);
          } else {
            console.warn('Analysis completed but no summary received. Using partial data.');
          }

          // Calculate duration from audio blob
          const audio = new Audio();
          const audioUrl = URL.createObjectURL(audioBlob);
          
          await new Promise((resolve) => {
            audio.addEventListener('loadedmetadata', resolve);
            audio.src = audioUrl;
          });
          
          const durationSeconds = Math.floor(audio.duration);
          const minutes = Math.floor(durationSeconds / 60);
          const seconds = durationSeconds % 60;
          const formattedDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
          
          URL.revokeObjectURL(audioUrl);

          // Save recording to database
          const { error: dbError } = await supabase
            .from('recordings')
            .insert({
              user_id: user.id,
              title: title || "Untitled Recording",
              audio_url: publicUrl,
              transcription: transcriptionData.text,
              summary: analysisData.summary,
              sentiment: analysisData.sentiment,
              tags: analysisData.tags,
              duration_seconds: durationSeconds,
              duration_formatted: formattedDuration
            });

          if (dbError) throw dbError;

          // Save highlights if any
          if (analysisData.highlights && analysisData.highlights.length > 0) {
            const { data: recordingData } = await supabase
              .from('recordings')
              .select('id')
              .eq('audio_url', publicUrl)
              .single();

            if (recordingData) {
              const highlightsToInsert = analysisData.highlights.map((highlight: any) => ({
                recording_id: recordingData.id,
                timestamp_seconds: highlight.timestamp,
                content: highlight.content
              }));

              await supabase
                .from('highlights')
                .insert(highlightsToInsert);
            }
          }

          toast({
            title: "Recording Saved!",
            description: "Your recording has been transcribed and analyzed successfully.",
          });

          // Trigger a refetch of recordings in the parent component
          window.dispatchEvent(new CustomEvent('recording-saved'));

          // Reset state
          handleDiscard();
          
        } catch (error) {
          console.error('Processing error details:', error);
          let errorMessage = "Failed to process recording. Please try again.";
          
          if (error instanceof Error) {
            errorMessage = error.message;
          }
          
          toast({
            title: "Processing Error", 
            description: errorMessage,
            variant: "destructive",
          });
        } finally {
          setIsProcessing(false);
        }
      };

      reader.readAsDataURL(audioBlob);

    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: "Save Error",
        description: "Failed to save recording. Please try again.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  return (
    <Card className="glass glow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-primary" />
          Voice Recording
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Recording Title */}
        <div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Recording title..."
            className="bg-muted/30 border-primary/20 focus:border-primary"
          />
        </div>

        {/* Recording Controls */}
        <div className="flex flex-col items-center space-y-4">
          {/* Waveform Visualization */}
          <div className="w-full max-w-md">
            <Waveform 
              className="justify-center" 
              isRecording={isRecording && !isPaused}
              bars={12}
            />
          </div>

          {/* Duration Display */}
          <div className="text-2xl font-mono text-primary">
            {duration}
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-3">
            {!isRecording ? (
              <Button
                onClick={handleRecord}
                size="lg"
                className="h-16 w-16 rounded-full bg-gradient-primary hover:shadow-lg hover:shadow-primary/50 transition-all"
              >
                <Mic className="h-6 w-6" />
              </Button>
            ) : (
              <div className="flex items-center gap-3">
                <Button
                  onClick={handlePause}
                  variant="secondary"
                  size="lg"
                  className="h-12 w-12 rounded-full"
                >
                  {isPaused ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                </Button>
                
                <Button
                  onClick={handleStop}
                  variant="destructive"
                  size="lg"
                  className="h-16 w-16 rounded-full"
                >
                  <Square className="h-6 w-6" />
                </Button>
              </div>
            )}
          </div>

          {/* Recording Status */}
          {isRecording && (
            <Badge className="bg-primary/20 text-primary border-primary/30 px-3 py-1">
              {isPaused ? "Paused" : "Recording..."}
            </Badge>
          )}
        </div>

        {/* Action Buttons */}
        {(isRecording || audioUrl) && (
          <div className="flex justify-center gap-2 pt-4 border-t border-border/50">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleDiscard}
              disabled={isProcessing}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Discard
            </Button>
            {audioUrl && (
              <Button 
                variant="default" 
                size="sm" 
                onClick={handleSaveAndTranscribe}
                disabled={isProcessing}
                className="bg-gradient-primary"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save & Transcribe
                  </>
                )}
              </Button>
            )}
          </div>
        )}

        {/* Processing Status */}
        {isProcessing && (
          <div className="text-center py-4">
            <Badge className="bg-accent/20 text-accent border-accent/30 px-3 py-1">
              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
              Transcribing and analyzing...
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}