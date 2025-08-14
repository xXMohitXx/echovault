import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: string;
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  stopRecording: () => Promise<string | null>;
  audioBlob: Blob | null;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState("00:00");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const { toast } = useToast();

  const updateDuration = () => {
    if (!startTimeRef.current) return;
    
    const elapsed = Date.now() - startTimeRef.current;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    const formattedDuration = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    setDuration(formattedDuration);
  };

  const startRecording = async () => {
    try {
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 44100,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      console.log('Microphone access granted, stream:', stream);

      streamRef.current = stream;
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
          ? 'audio/webm;codecs=opus' 
          : 'audio/webm',
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
      };

      mediaRecorder.start(100); // Collect data every 100ms
      console.log('MediaRecorder started');
      
      setIsRecording(true);
      setIsPaused(false);
      startTimeRef.current = Date.now();
      setDuration("00:00");
      
      // Start simple timer
      intervalRef.current = setInterval(updateDuration, 1000);
      console.log('Recording started successfully');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      let errorMessage = "Failed to start recording. Please check microphone permissions.";
      
      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = "Microphone access denied. Please allow microphone permissions and try again.";
            break;
          case 'NotFoundError':
            errorMessage = "No microphone found. Please connect a microphone and try again.";
            break;
          case 'NotSupportedError':
            errorMessage = "Your browser doesn't support audio recording.";
            break;
        }
      }
      
      toast({
        title: "Recording Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const pauseRecording = () => {
    if (!mediaRecorderRef.current || !isRecording) return;

    if (isPaused) {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      console.log('Recording resumed');
    } else {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      console.log('Recording paused');
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    if (!mediaRecorderRef.current || !isRecording) return null;

    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(null);
        return;
      }

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Clean up
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        
        setIsRecording(false);
        setIsPaused(false);
        
        // Create a URL for the blob
        const audioUrl = URL.createObjectURL(blob);
        resolve(audioUrl);
      };

      mediaRecorderRef.current.stop();
    });
  };

  return {
    isRecording,
    isPaused,
    duration,
    startRecording,
    pauseRecording,
    stopRecording,
    audioBlob,
  };
}