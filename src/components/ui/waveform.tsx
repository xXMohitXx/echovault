import { cn } from "@/lib/utils";

interface WaveformProps {
  className?: string;
  isRecording?: boolean;
  bars?: number;
}

export function Waveform({ className, isRecording = false, bars = 5 }: WaveformProps) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "w-1 bg-waveform-primary rounded-full transition-all",
            isRecording ? "waveform-bar h-6" : "h-3",
            i % 2 === 0 ? "opacity-80" : "opacity-60"
          )}
          style={{
            animationDelay: isRecording ? `${i * 0.1}s` : undefined,
          }}
        />
      ))}
    </div>
  );
}