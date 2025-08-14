import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Filter, Clock, Tag, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

interface SearchResult {
  id: string;
  title: string;
  snippet: string;
  timestamp: string;
  tags: string[];
  audio_url: string;
  transcription: string;
}

export function SearchInterface() {
  const [query, setQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [allRecordings, setAllRecordings] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchRecordings();
    }
  }, [user]);

  const fetchRecordings = async () => {
    try {
      const { data, error } = await supabase
        .from('recordings')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setAllRecordings(data || []);
    } catch (error) {
      console.error('Error fetching recordings:', error);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    
    setIsSearching(true);
    
    // Search through recordings based on title, transcription, tags
    const filteredResults = allRecordings.filter(recording => {
      const searchText = query.toLowerCase();
      return (
        recording.title?.toLowerCase().includes(searchText) ||
        recording.transcription?.toLowerCase().includes(searchText) ||
        recording.summary?.toLowerCase().includes(searchText) ||
        recording.tags?.some((tag: string) => tag.toLowerCase().includes(searchText))
      );
    }).map(recording => ({
      id: recording.id,
      title: recording.title || 'Untitled Recording',
      snippet: recording.summary || recording.transcription?.substring(0, 150) + '...' || 'No content available',
      timestamp: new Date(recording.created_at).toLocaleDateString(),
      tags: recording.tags || [],
      audio_url: recording.audio_url,
      transcription: recording.transcription
    }));

    setResults(filteredResults);
    setIsSearching(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search conversations, topics, or ask questions..."
          className="pl-10 pr-24 h-12 bg-muted/30 border-primary/20 focus:border-primary text-base"
        />
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex gap-2">
          <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
            <Filter className="h-4 w-4" />
          </Button>
          <Button 
            size="sm" 
            onClick={handleSearch}
            disabled={isSearching}
            className="h-8"
          >
            {isSearching ? "..." : "Search"}
          </Button>
        </div>
      </div>

      {/* Quick Filters */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20">
          <Clock className="h-3 w-3 mr-1" />
          Recent
        </Badge>
        <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20">
          <Tag className="h-3 w-3 mr-1" />
          Meetings
        </Badge>
        <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20">
          <Mic className="h-3 w-3 mr-1" />
          Ideas
        </Badge>
        <Badge variant="secondary" className="cursor-pointer hover:bg-primary/20">
          <Tag className="h-3 w-3 mr-1" />
          Decisions
        </Badge>
      </div>

      {/* Search Results */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">
            Found {results.length} results
          </h3>
          
          {results.map((result) => (
            <Card key={result.id} className="glass hover:glow-primary transition-all cursor-pointer">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h4 className="font-semibold text-primary hover:text-primary-glow transition-colors">
                    {result.title}
                  </h4>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{result.timestamp}</span>
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                  {result.snippet}
                </p>
                
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {result.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-primary hover:text-primary-glow"
                    onClick={() => {
                      // Play audio functionality can be added here
                      console.log('Playing recording:', result.id);
                    }}
                  >
                    <Mic className="h-4 w-4 mr-2" />
                    Play Recording
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}