import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  Search, 
  FolderOpen, 
  Network, 
  Settings, 
  Plus,
  Zap,
  Brain,
  Lock,
  LogOut,
  User
} from "lucide-react";

import { RecordingInterface } from "@/components/recording-interface";
import { RecordingCard } from "@/components/recording-card";
import { SearchInterface } from "@/components/search-interface";
import { testPipeline, logPipelineResults } from "@/utils/test-pipeline";
import { testCompletePipeline } from "@/utils/test-functions";
import { KnowledgeGraph } from "@/components/knowledge-graph";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const mockRecordings = [
  {
    title: "Team Meeting - Q4 Strategy",
    duration: "45:30",
    timestamp: "2 hours ago",
    tags: ["meetings", "strategy", "Q4"],
    sentiment: "positive" as const,
    hasTranscript: true
  },
  {
    title: "Brainstorming Session",
    duration: "28:15",
    timestamp: "1 day ago", 
    tags: ["brainstorming", "product", "AI"],
    sentiment: "neutral" as const,
    hasTranscript: true
  },
  {
    title: "Client Call - Project Update",
    duration: "32:45",
    timestamp: "3 days ago",
    tags: ["client", "project", "update"],
    sentiment: "positive" as const,
    hasTranscript: true
  }
];

export default function Index() {
  const [activeTab, setActiveTab] = useState("record");
  const [recordings, setRecordings] = useState([]);
  const [stats, setStats] = useState({
    totalRecordings: 0,
    uniqueTopics: 0,
    connections: 0,
    totalDuration: '0h'
  });
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchRecordings();
      fetchStats();
    }
  }, [user]); // The functions are stable, so this is fine

  // Listen for new recordings
  useEffect(() => {
    const handleRecordingSaved = () => {
      if (user) {
        fetchRecordings();
        fetchStats();
      }
    };

    window.addEventListener('recording-saved', handleRecordingSaved);
    return () => window.removeEventListener('recording-saved', handleRecordingSaved);
  }, [user]); // Add user dependency to prevent calling when no user
  
  // Debug function to test the entire pipeline
  const runPipelineTest = async () => {
    const results = await testPipeline();
    logPipelineResults(results);
  };

  // Test the actual edge functions
  const runFunctionTest = async () => {
    await testCompletePipeline();
  };

  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setRecordings(data || []);
    } catch (error) {
      console.error('Error fetching recordings:', error);
    }
  };

  const fetchStats = async () => {
    try {
      // Fetch recordings with tags and duration info
      const { data: recordingsData, error } = await supabase
        .from('recordings')
        .select('tags, created_at, transcription')
        .eq('user_id', user?.id);
      
      if (error) throw error;

      const allRecordings = recordingsData || [];
      
      // Calculate total recordings
      const totalRecordings = allRecordings.length;
      
      // Calculate unique topics (tags)
      const allTags = new Set<string>();
      let totalConnections = 0;
      
      allRecordings.forEach(recording => {
        const tags = recording.tags || [];
        tags.forEach((tag: string) => allTags.add(tag));
        
        // Count connections (each recording with multiple tags creates connections)
        if (tags.length > 1) {
          totalConnections += (tags.length * (tags.length - 1)) / 2;
        }
      });
      
      const uniqueTopics = allTags.size;
      
      // Estimate total duration based on transcription length
      // Rough estimate: 150 words per minute, average 5 characters per word
      const estimatedDuration = allRecordings.reduce((total, recording) => {
        if (recording.transcription) {
          const wordCount = recording.transcription.split(' ').length;
          const minutes = Math.ceil(wordCount / 150);
          return total + minutes;
        }
        return total + 5; // Default 5 minutes for recordings without transcription
      }, 0);
      
      const hours = Math.floor(estimatedDuration / 60);
      const remainingMinutes = estimatedDuration % 60;
      const totalDuration = hours > 0 
        ? `${hours}h ${remainingMinutes}m` 
        : `${remainingMinutes}m`;
      
      setStats({
        totalRecordings,
        uniqueTopics,
        connections: totalConnections,
        totalDuration
      });
      
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleRenameRecording = async (id: string) => {
    const newTitle = prompt("Enter new recording title:");
    if (newTitle && newTitle.trim()) {
      try {
        const { error } = await supabase
          .from('recordings')
          .update({ title: newTitle.trim() })
          .eq('id', id);
        
        if (error) throw error;
        
        // Refresh recordings list
        fetchRecordings();
        
        toast({
          title: "Recording renamed",
          description: "Recording title has been updated successfully.",
        });
      } catch (error) {
        console.error('Error renaming recording:', error);
        toast({
          title: "Error",
          description: "Failed to rename recording. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  const handleDownloadRecording = async (id: string) => {
    try {
      const recording = recordings.find((r: any) => r.id === id);
      if (!recording?.audio_url) {
        toast({
          title: "Error",
          description: "Audio file not found for this recording.",
          variant: "destructive",
        });
        return;
      }

      // Create a temporary anchor element to trigger download
      const link = document.createElement('a');
      link.href = recording.audio_url;
      link.download = `${recording.title || 'recording'}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Download started",
        description: "Your recording is being downloaded.",
      });
    } catch (error) {
      console.error('Error downloading recording:', error);
      toast({
        title: "Error",
        description: "Failed to download recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleShareRecording = async (id: string) => {
    try {
      const recording = recordings.find((r: any) => r.id === id);
      if (!recording) return;

      if (navigator.share) {
        await navigator.share({
          title: recording.title || 'Recording',
          text: recording.summary || 'Check out this recording',
          url: recording.audio_url
        });
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(recording.audio_url);
        toast({
          title: "Link copied",
          description: "Recording link has been copied to clipboard.",
        });
      }
    } catch (error) {
      console.error('Error sharing recording:', error);
      toast({
        title: "Error",
        description: "Failed to share recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRecording = async (id: string) => {
    try {
      const recording = recordings.find((r: any) => r.id === id);
      if (!recording) return;

      // Delete from storage first
      if (recording.audio_url) {
        const fileName = recording.audio_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('recordings')
            .remove([`${user?.id}/${fileName}`]);
        }
      }

      // Delete from database
      const { error } = await supabase
        .from('recordings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Refresh recordings list
      fetchRecordings();
      fetchStats();
      
      toast({
        title: "Recording deleted",
        description: "Recording has been permanently deleted.",
      });
    } catch (error) {
      console.error('Error deleting recording:', error);
      toast({
        title: "Error",
        description: "Failed to delete recording. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading EchoVault...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-primary rounded-lg flex items-center justify-center glow-primary">
                <Mic className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  EchoVault
                </h1>
                <p className="text-sm text-muted-foreground">Every word echoes. Store them forever.</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Badge className="bg-accent/20 text-accent border-accent/30">
                <Zap className="h-3 w-3 mr-1" />
                AI Powered
              </Badge>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate("/profile")}>
                  <User className="h-4 w-4 mr-2" />
                  {user?.email?.split('@')[0]}
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:grid-cols-4 glass">
            <TabsTrigger value="record" className="flex items-center gap-2">
              <Mic className="h-4 w-4" />
              Record
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="library" className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4" />
              Library
            </TabsTrigger>
            <TabsTrigger value="graph" className="flex items-center gap-2">
              <Network className="h-4 w-4" />
              Knowledge Graph
            </TabsTrigger>
          </TabsList>

          {/* Record Tab */}
          <TabsContent value="record" className="space-y-8">
            <div className="grid lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                <RecordingInterface />
              </div>
              
              <div className="space-y-6">
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-accent" />
                      AI Features
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 bg-accent rounded-full"></div>
                      <span>Real-time transcription</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 bg-secondary rounded-full"></div>
                      <span>Intelligent summaries</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 bg-primary rounded-full"></div>
                      <span>Automatic tagging</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 bg-waveform-accent rounded-full"></div>
                      <span>Sentiment analysis</span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                      Privacy First
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      All recordings are stored securely and privately. Your data stays yours.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Search Tab */}
          <TabsContent value="search">
            <SearchInterface />
          </TabsContent>

          {/* Library Tab */}
          <TabsContent value="library" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold">Your Recording Library</h2>
                <p className="text-muted-foreground">Organize and revisit your conversations</p>
              </div>
              <Button className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                New Folder
              </Button>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recordings.length > 0 ? (
                recordings.map((recording) => (
                  <RecordingCard 
                    key={recording.id}
                    id={recording.id}
                    title={recording.title || "Untitled Recording"}
                    duration={recording.duration_formatted || "00:00"}
                    timestamp={new Date(recording.created_at).toLocaleDateString()}
                    tags={recording.tags || []}
                    sentiment={recording.sentiment as "positive" | "neutral" | "negative" || "neutral"}
                    hasTranscript={!!recording.transcription}
                    transcription={recording.transcription}
                    summary={recording.summary}
                    audioUrl={recording.audio_url}
                    onEdit={handleRenameRecording}
                    onDownload={handleDownloadRecording}
                    onShare={handleShareRecording}
                    onDelete={handleDeleteRecording}
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <Mic className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No recordings yet</h3>
                  <p className="text-muted-foreground mb-4">Start recording to build your voice library</p>
                  <Button 
                    onClick={() => setActiveTab("record")}
                    className="bg-gradient-primary"
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Start Recording
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Knowledge Graph Tab */}
          <TabsContent value="graph" className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">Knowledge Graph</h2>
              <p className="text-muted-foreground">
                Explore connections between your conversations and topics
              </p>
            </div>
            
            <KnowledgeGraph />
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-primary">{stats.totalRecordings}</div>
                  <div className="text-sm text-muted-foreground">Total Recordings</div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-secondary">{stats.uniqueTopics}</div>
                  <div className="text-sm text-muted-foreground">Unique Topics</div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-accent">{stats.connections}</div>
                  <div className="text-sm text-muted-foreground">Connections</div>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="p-4 text-center">
                  <div className="text-2xl font-bold text-waveform-accent">{stats.totalDuration}</div>
                  <div className="text-sm text-muted-foreground">Total Duration</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}