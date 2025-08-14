import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Play, MoreHorizontal, Clock, Tag, Activity, ChevronDown, ChevronUp, Download, Edit, Trash2, Share } from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordingCardProps {
  id?: string;
  title: string;
  duration: string;
  timestamp: string;
  tags: string[];
  sentiment?: "positive" | "neutral" | "negative";
  hasTranscript?: boolean;
  transcription?: string;
  summary?: string;
  audioUrl?: string;
  className?: string;
  onPlay?: (id: string) => void;
  onDelete?: (id: string) => void;
  onEdit?: (id: string) => void;
  onDownload?: (id: string) => void;
  onShare?: (id: string) => void;
}

export function RecordingCard({
  id = "unknown",
  title,
  duration,
  timestamp,
  tags,
  sentiment = "neutral",
  hasTranscript = true,
  transcription,
  summary,
  audioUrl,
  className,
  onPlay,
  onDelete,
  onEdit,
  onDownload,
  onShare
}: RecordingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const sentimentColors = {
    positive: "bg-accent/20 text-accent border-accent/30",
    neutral: "bg-secondary/20 text-secondary border-secondary/30", 
    negative: "bg-destructive/20 text-destructive border-destructive/30"
  };

  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onPlay && id) {
      onPlay(id);
    } else {
      console.log('Playing recording:', id);
    }
  };

  const handleCardClick = () => {
    if (hasTranscript) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleMenuAction = (action: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    switch (action) {
      case 'edit':
        if (onEdit) {
          onEdit(id);
        } else {
          console.log('Edit recording:', id);
        }
        break;
      case 'download':
        if (onDownload) {
          onDownload(id);
        } else {
          console.log('Download recording:', id);
        }
        break;
      case 'share':
        if (onShare) {
          onShare(id);
        } else {
          console.log('Share recording:', id);
        }
        break;
      case 'delete':
        if (confirm('Are you sure you want to delete this recording?')) {
          if (onDelete) {
            onDelete(id);
          } else {
            console.log('Delete recording:', id);
          }
        }
        break;
    }
  };

  return (
    <Card 
      className={cn(
        "glass glow-card hover:glow-primary transition-all duration-300 group cursor-pointer", 
        className
      )}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold group-hover:text-primary transition-colors">
            {title}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8 p-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => handleMenuAction('edit', e)}>
                <Edit className="h-4 w-4 mr-2" />
                Rename Recording
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleMenuAction('download', e)}>
                <Download className="h-4 w-4 mr-2" />
                Download Audio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => handleMenuAction('share', e)}>
                <Share className="h-4 w-4 mr-2" />
                Share Recording
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={(e) => handleMenuAction('delete', e)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Recording
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span>{duration}</span>
          <span>•</span>
          <span>{timestamp}</span>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Audio Playback */}
        {audioUrl && (
          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">Audio Recording:</span>
              <span className="text-xs text-muted-foreground">{duration}</span>
            </div>
            <audio 
              controls 
              src={audioUrl}
              className="w-full h-10"
              preload="metadata"
            />
          </div>
        )}

        {/* Waveform Preview - Only show when no audio URL */}
        {!audioUrl && (
          <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0 hover:bg-primary/20"
              onClick={handlePlayClick}
            >
              <Play className="h-4 w-4" />
            </Button>
            <div className="flex-1 h-8 bg-gradient-to-r from-waveform-primary/20 via-waveform-secondary/20 to-waveform-accent/20 rounded flex items-center px-3">
              <Activity className="h-4 w-4 text-waveform-primary" />
            </div>
          </div>
        )}

        {/* Tags and Sentiment */}
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              <Tag className="h-3 w-3 mr-1" />
              {tag}
            </Badge>
          ))}
          {sentiment !== "neutral" && (
            <Badge className={cn("text-xs", sentimentColors[sentiment])}>
              {sentiment}
            </Badge>
          )}
        </div>

        {hasTranscript && (
          <div className="space-y-2">
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              <span className="text-sm font-medium">Transcription</span>
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </div>
            
            <div className="text-sm text-muted-foreground bg-muted/20 p-3 rounded-lg">
              {isExpanded ? (
                <div className="space-y-2">
                  {summary && (
                    <div>
                      <strong>Summary:</strong>
                      <p>{summary}</p>
                    </div>
                  )}
                  {transcription && (
                    <div>
                      <strong>Full Transcription:</strong>
                      <p>{transcription}</p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="line-clamp-2">
                  {summary || transcription || "Click to view full content..."}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}