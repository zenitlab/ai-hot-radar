import { useMemo, useCallback } from 'react';
import {
  ReactFlow, Background, Controls,
  type Node, type Edge,
  Handle, Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { GraphNode, GraphEdge } from '../../services/api';

// ── Node type colors ─────────────────────────────────────────────────────────
const TYPE_COLOR: Record<string, string> = {
  model:      '#3b82f6',
  company:    '#10b981',
  product:    '#f59e0b',
  technology: '#8b5cf6',
  person:     '#ef4444',
  satellite:  '#6b7280',
};

function EntityNode({ data }: { data: { label: string; type: string; isTracked: boolean; isSelected: boolean } }) {
  const color = TYPE_COLOR[data.type] ?? '#6b7280';
  const size = data.isTracked ? 'px-3 py-1.5 text-xs font-semibold' : 'px-2 py-1 text-[10px]';
  const ring = data.isSelected ? `ring-2 ring-offset-1 ring-[${color}]` : '';
  return (
    <>
      <Handle type="target" position={Position.Top} style={{ opacity: 0 }} />
      <div
        className={`rounded-lg border ${size} ${ring} cursor-default select-none transition-all`}
        style={{
          background: data.isTracked ? `${color}22` : 'var(--card-bg)',
          borderColor: data.isTracked ? `${color}66` : 'var(--card-border)',
          color: data.isTracked ? color : 'var(--text-muted)',
          boxShadow: data.isSelected ? `0 0 0 2px ${color}` : undefined,
        }}
      >
        {data.label}
      </div>
      <Handle type="source" position={Position.Bottom} style={{ opacity: 0 }} />
    </>
  );
}

const nodeTypes = { entityNode: EntityNode };

// ── Layout: circle + satellites ───────────────────────────────────────────────
function buildGraph(
  graphNodes: GraphNode[],
  graphEdges: GraphEdge[],
  selectedName: string | null,
): { nodes: Node[]; edges: Edge[] } {
  const tracked = graphNodes.filter((n) => n.isTracked);
  const satellites = graphNodes.filter((n) => !n.isTracked);

  const CX = 240, CY = 160;
  const trackedRadius = Math.max(80, Math.min(140, tracked.length * 28));

  const trackedPositions = tracked.map((_, i) => {
    if (tracked.length === 1) return { x: CX - 45, y: CY - 18 };
    const angle = (i / tracked.length) * 2 * Math.PI - Math.PI / 2;
    return { x: CX + trackedRadius * Math.cos(angle) - 45, y: CY + trackedRadius * Math.sin(angle) - 18 };
  });

  // Map tracked name → position for satellite placement
  const trackedPosMap: Record<string, { x: number; y: number }> = {};
  tracked.forEach((t, i) => { trackedPosMap[t.name] = trackedPositions[i]; });

  const rfNodes: Node[] = [
    ...tracked.map((n, i) => ({
      id: n.name,
      type: 'entityNode',
      position: trackedPositions[i],
      data: { label: n.name, type: n.type, isTracked: true, isSelected: n.name === selectedName },
    })),
  ];

  // Place satellites near their source tracked node
  const satelliteOffsets: Record<string, number> = {};
  for (const sat of satellites) {
    const edge = graphEdges.find((e) => e.fromName === sat.name || e.toName === sat.name);
    const parentName = edge ? (edge.fromName === sat.name ? edge.toName : edge.fromName) : (tracked[0]?.name ?? '');
    const parentPos = trackedPosMap[parentName] ?? { x: CX, y: CY };
    const idx = (satelliteOffsets[parentName] = (satelliteOffsets[parentName] ?? 0) + 1);
    const angle = -Math.PI / 4 + (idx * Math.PI) / 3;
    const r = 90;
    rfNodes.push({
      id: sat.name,
      type: 'entityNode',
      position: { x: parentPos.x + r * Math.cos(angle), y: parentPos.y + r * Math.sin(angle) },
      data: { label: sat.name, type: sat.type, isTracked: false, isSelected: false },
    });
  }

  const rfEdges: Edge[] = graphEdges.map((e) => ({
    id: e.id,
    source: e.fromName,
    target: e.toName,
    label: e.relation.replace(/_/g, ' '),
    type: 'smoothstep',
    style: { stroke: 'rgba(59,130,246,0.4)', strokeWidth: 1.5 },
    labelStyle: { fontSize: 9, fill: '#8b8fa8' },
    labelBgStyle: { fill: 'transparent' },
  }));

  return { nodes: rfNodes, edges: rfEdges };
}

interface EntityGraphProps {
  graphNodes: GraphNode[];
  graphEdges: GraphEdge[];
  selectedName: string | null;
  onSelectNode: (name: string) => void;
}

export function EntityGraph({ graphNodes, graphEdges, selectedName, onSelectNode }: EntityGraphProps) {
  const { nodes, edges } = useMemo(
    () => buildGraph(graphNodes, graphEdges, selectedName),
    [graphNodes, graphEdges, selectedName],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    onSelectNode(node.id);
  }, [onSelectNode]);

  if (graphNodes.filter(n => n.isTracked).length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
        添加关键词后图谱自动生成
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      onNodeClick={onNodeClick}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      zoomOnScroll={false}
      panOnScroll={false}
      preventScrolling={false}
    >
      <Background color="var(--card-border)" gap={24} size={1} />
      <Controls showInteractive={false} style={{ bottom: 8, right: 8 }} />
    </ReactFlow>
  );
}
