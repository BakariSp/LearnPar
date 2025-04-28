'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { apiGetUserLearningPaths, UserLearningPathResponseItem } from '@/services/api';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { ForceGraphMethods, LinkObject, NodeObject as GraphNode } from 'react-force-graph-2d';
import styles from './knowledge-map.module.css';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

interface CustomNode extends GraphNode {
  id: number;
  name: string;
  val: number;
  color: string;
  learning_path_id: number;
}

const NODE_COLORS = [
  'rgba(59, 130, 246, 0.8)',
  'rgba(16, 185, 129, 0.8)',
  'rgba(249, 115, 22, 0.8)',
];

const KnowledgeMapPage = () => {
  const [keywords, setKeywords] = useState<CustomNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const router = useRouter();
  const fgRef = useRef<ForceGraphMethods<CustomNode, LinkObject> | undefined>(undefined);

  useEffect(() => {
    const fetchLearningPaths = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const paths: UserLearningPathResponseItem[] = await apiGetUserLearningPaths();

        let processedNodes: CustomNode[] = paths.map((item, index): CustomNode => {
          const baseSize = 10;
          const randomVariance = Math.random() * 10;
          return {
            id: index,
            name: item.learning_path.title,
            val: baseSize + randomVariance,
            color: NODE_COLORS[Math.floor(Math.random() * NODE_COLORS.length)],
            learning_path_id: item.learning_path_id,
          };
        });

        const MAX_KEYWORDS = 25;
        if (processedNodes.length > MAX_KEYWORDS) {
          processedNodes = processedNodes.sort(() => 0.5 - Math.random()).slice(0, MAX_KEYWORDS);
        }

        setKeywords(processedNodes);
      } catch (err) {
        console.error("Failed to fetch learning paths:", err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchLearningPaths();
  }, []);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };
    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, [isLoading]);

  useEffect(() => {
    if (fgRef.current) {
      const engine = fgRef.current.d3Force('charge');
      if (engine) {
        engine.strength(-120);
      }
      fgRef.current.d3ReheatSimulation();
    }
  }, [keywords]);

  const graphData = useMemo(() => {
    const links: LinkObject[] = [];
    if (keywords.length === 0) {
      return { nodes: [], links: [] };
    }

    const existingLinks = new Map<string, boolean>();
    const connectionCounts = new Map<number, number>();
    keywords.forEach(node => connectionCounts.set(node.id, 0));

    keywords.forEach(node => {
      let currentConnections = connectionCounts.get(node.id) || 0;
      if (currentConnections >= 2) return;

      const potentialPartners = keywords.filter(
        p => p.color === node.color && p.id !== node.id
      );

      potentialPartners.sort(() => 0.5 - Math.random());

      for (const partner of potentialPartners) {
        if (currentConnections >= 2) break;

        const partnerConnections = connectionCounts.get(partner.id) || 0;
        if (partnerConnections >= 2) continue;

        const linkKey = [node.id, partner.id].sort().join('-');
        if (existingLinks.has(linkKey)) continue;

        links.push({ source: node.id, target: partner.id });
        existingLinks.set(linkKey, true);

        currentConnections++;
        connectionCounts.set(node.id, currentConnections);
        connectionCounts.set(partner.id, partnerConnections + 1);
      }
    });

    return { nodes: keywords, links };
  }, [keywords]);

  const nodeCanvasObject = (node: unknown, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const customNode = node as CustomNode;
    const label = customNode.name;
    const nodeRadius = Math.sqrt(customNode.val) * 1.5;
    const fontSize = 12 / globalScale;

    const x = customNode.x ?? 0;
    const y = customNode.y ?? 0;

    ctx.beginPath();
    ctx.arc(x, y, nodeRadius, 0, 2 * Math.PI, false);
    ctx.fillStyle = customNode.color;
    ctx.fill();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
    ctx.font = `${fontSize}px Sans-Serif`;
    ctx.fillText(label, x, y + nodeRadius + 3 / globalScale);
  };

  const handleNodeClick = (node: unknown) => {
    const customNode = node as CustomNode;
    if (customNode.learning_path_id) {
      router.push(`/learning-paths/${customNode.learning_path_id}`);
    }
  };

  return (
    <div className="container mx-auto p-4 h-[calc(100vh-100px)] flex flex-col">
      <div ref={containerRef} className={styles.container}>
        {isLoading && <p className={styles.loadingOverlay}>Loading knowledge map...</p>}
        {error && <p className={styles.errorOverlay}>Error: {error}</p>}
        {!isLoading && !error && keywords.length === 0 && (
          <p className={styles.loadingOverlay}>
            No learning paths found to build the map.
          </p>
        )}
        {!isLoading && !error && keywords.length > 0 && dimensions.width > 0 && (
          <ForceGraph2D
            ref={fgRef as any}
            width={dimensions.width}
            height={dimensions.height}
            graphData={graphData}
            nodeCanvasObject={nodeCanvasObject}
            nodePointerAreaPaint={(node, color, ctx) => {
              const customNode = node as CustomNode;
              const r = Math.sqrt(customNode.val) * 1.5;
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(customNode.x ?? 0, customNode.y ?? 0, r, 0, 2 * Math.PI, false);
              ctx.fill();
            }}
            linkColor={(link: any) => link.source.color ? `${link.source.color.slice(0,-4)}0.3)`: 'rgba(0,0,0,0.1)'}
            linkWidth={1}
            enableZoomInteraction={true}
            enablePointerInteraction={true}
            dagMode={undefined}
            onNodeClick={handleNodeClick}
          />
        )}
      </div>
    </div>
  );
};

export default KnowledgeMapPage;
