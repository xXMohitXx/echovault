import { useCallback, useEffect, useState } from 'react';
import { 
  ReactFlow, 
  addEdge, 
  Connection, 
  Edge, 
  Node, 
  useNodesState, 
  useEdgesState,
  Background,
  Controls,
  MiniMap
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/use-auth';

const initialNodes: Node[] = [
  {
    id: 'meetings',
    type: 'default',
    position: { x: 250, y: 50 },
    data: { label: 'Meetings' },
    style: {
      background: 'hsl(var(--primary))',
      color: 'hsl(var(--primary-foreground))',
      border: '2px solid hsl(var(--primary-glow))',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600'
    }
  },
  {
    id: 'project-planning',
    type: 'default',
    position: { x: 100, y: 150 },
    data: { label: 'Project Planning' },
    style: {
      background: 'hsl(var(--secondary))',
      color: 'hsl(var(--secondary-foreground))',
      border: '2px solid hsl(var(--secondary))',
      borderRadius: '12px',
      fontSize: '12px'
    }
  },
  {
    id: 'brainstorming',
    type: 'default',
    position: { x: 400, y: 150 },
    data: { label: 'Brainstorming' },
    style: {
      background: 'hsl(var(--accent))',
      color: 'hsl(var(--accent-foreground))',
      border: '2px solid hsl(var(--accent))',
      borderRadius: '12px',
      fontSize: '12px'
    }
  },
  {
    id: 'ideas',
    type: 'default',
    position: { x: 350, y: 250 },
    data: { label: 'Ideas' },
    style: {
      background: 'hsl(var(--card))',
      color: 'hsl(var(--card-foreground))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '12px',
      fontSize: '11px'
    }
  },
  {
    id: 'decisions',
    type: 'default',
    position: { x: 50, y: 250 },
    data: { label: 'Decisions' },
    style: {
      background: 'hsl(var(--card))',
      color: 'hsl(var(--card-foreground))',
      border: '1px solid hsl(var(--border))',
      borderRadius: '12px',
      fontSize: '11px'
    }
  }
];

const initialEdges: Edge[] = [
  {
    id: 'meetings-planning',
    source: 'meetings',
    target: 'project-planning',
    style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 }
  },
  {
    id: 'meetings-brainstorming',
    source: 'meetings',
    target: 'brainstorming',
    style: { stroke: 'hsl(var(--primary))', strokeWidth: 2 }
  },
  {
    id: 'planning-decisions',
    source: 'project-planning',
    target: 'decisions',
    style: { stroke: 'hsl(var(--secondary))', strokeWidth: 1 }
  },
  {
    id: 'brainstorming-ideas',
    source: 'brainstorming',
    target: 'ideas',
    style: { stroke: 'hsl(var(--accent))', strokeWidth: 1 }
  }
];

export function KnowledgeGraph() {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  useEffect(() => {
    if (user) {
      generateKnowledgeGraph();
    }
  }, [user]);

  const generateKnowledgeGraph = async () => {
    try {
      setIsLoading(true);
      
      // Fetch recordings with tags
      const { data: recordings, error } = await supabase
        .from('recordings')
        .select('tags, sentiment, title')
        .eq('user_id', user?.id)
        .not('tags', 'is', null);

      if (error) throw error;

      if (!recordings || recordings.length === 0) {
        setNodes(initialNodes);
        setEdges(initialEdges);
        setIsLoading(false);
        return;
      }

      // Extract all unique tags and their relationships
      const tagConnections: { [key: string]: Set<string> } = {};
      const tagCounts: { [key: string]: number } = {};
      const tagSentiments: { [key: string]: string[] } = {};

      recordings.forEach((recording) => {
        const tags = recording.tags || [];
        const sentiment = recording.sentiment || 'neutral';
        
        tags.forEach((tag: string) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          tagSentiments[tag] = tagSentiments[tag] || [];
          tagSentiments[tag].push(sentiment);
          
          if (!tagConnections[tag]) {
            tagConnections[tag] = new Set();
          }
          
          // Connect this tag to other tags in the same recording
          tags.forEach((otherTag: string) => {
            if (tag !== otherTag) {
              tagConnections[tag].add(otherTag);
            }
          });
        });
      });

      // Create nodes from tags
      const newNodes: Node[] = [];
      const positions = generateCircularPositions(Object.keys(tagCounts).length);
      
      Object.entries(tagCounts).forEach(([tag, count], index) => {
        const dominantSentiment = getDominantSentiment(tagSentiments[tag]);
        const nodeColor = getSentimentColor(dominantSentiment);
        const nodeSize = Math.max(60, Math.min(120, count * 20));
        
        newNodes.push({
          id: tag,
          type: 'default',
          position: positions[index],
          data: { 
            label: `${tag} (${count})`,
            count,
            sentiment: dominantSentiment
          },
          style: {
            background: nodeColor.background,
            color: nodeColor.text,
            border: `2px solid ${nodeColor.border}`,
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: '600',
            width: nodeSize,
            height: nodeSize,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '8px'
          }
        });
      });

      // Create edges from tag connections
      const newEdges: Edge[] = [];
      Object.entries(tagConnections).forEach(([source, targets]) => {
        targets.forEach((target) => {
          // Only create edge if both nodes exist and avoid duplicates
          if (tagCounts[target] && source < target) {
            const connectionStrength = Math.min(tagCounts[source], tagCounts[target]);
            newEdges.push({
              id: `${source}-${target}`,
              source,
              target,
              style: { 
                stroke: 'hsl(var(--primary))', 
                strokeWidth: Math.max(1, connectionStrength / 2),
                strokeOpacity: 0.6
              }
            });
          }
        });
      });

      setNodes(newNodes);
      setEdges(newEdges);
    } catch (error) {
      console.error('Error generating knowledge graph:', error);
      // Fallback to initial data
      setNodes(initialNodes);
      setEdges(initialEdges);
    } finally {
      setIsLoading(false);
    }
  };

  const getDominantSentiment = (sentiments: string[]): string => {
    const counts = sentiments.reduce((acc, sentiment) => {
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    return Object.entries(counts).reduce((a, b) => counts[a[0]] > counts[b[0]] ? a : b)[0];
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return {
          background: 'hsl(var(--accent))',
          text: 'hsl(var(--accent-foreground))',
          border: 'hsl(var(--accent))'
        };
      case 'negative':
        return {
          background: 'hsl(var(--destructive))',
          text: 'hsl(var(--destructive-foreground))',
          border: 'hsl(var(--destructive))'
        };
      default:
        return {
          background: 'hsl(var(--secondary))',
          text: 'hsl(var(--secondary-foreground))',
          border: 'hsl(var(--secondary))'
        };
    }
  };

  const generateCircularPositions = (count: number) => {
    const positions = [];
    const radius = Math.max(150, count * 25);
    const centerX = 300;
    const centerY = 200;
    
    for (let i = 0; i < count; i++) {
      const angle = (2 * Math.PI * i) / count;
      positions.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle)
      });
    }
    
    return positions;
  };

  return (
    <div className="h-96 w-full bg-muted/20 rounded-lg border border-border/50 relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm rounded-lg z-10">
          <div className="text-center space-y-2">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto"></div>
            <p className="text-sm text-muted-foreground">Generating knowledge graph...</p>
          </div>
        </div>
      )}
      
      {!isLoading && nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-2">
            <p className="text-muted-foreground">No recordings with tags found</p>
            <p className="text-sm text-muted-foreground">Record some audio to see your knowledge graph</p>
          </div>
        </div>
      )}
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        style={{ 
          background: 'transparent'
        }}
      >
        <Background 
          color="hsl(var(--border))" 
          gap={20} 
          size={1}
        />
        <Controls 
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
        />
        <MiniMap 
          style={{
            background: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px'
          }}
          nodeColor={(node) => {
            if (node.data?.sentiment === 'positive') return 'hsl(var(--accent))';
            if (node.data?.sentiment === 'negative') return 'hsl(var(--destructive))';
            return 'hsl(var(--secondary))';
          }}
        />
      </ReactFlow>
    </div>
  );
}