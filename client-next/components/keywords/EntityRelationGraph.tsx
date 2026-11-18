'use client';
import { useEffect, useLayoutEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { RelatedData } from '../../services/api';
import { cssVar } from '../../lib/cssVar';
import { useTheme } from '../../providers/ThemeProvider';

interface Props {
  entityName: string;
  relatedData: RelatedData | null;
  selectedNode?: string | null;
  onNodeClick: (name: string | null) => void;
}

const EDGE_LABEL: Record<number, string> = {
  1: '相关公司',
  2: '同系列',
  3: '集成产品',
  4: '竞争关系',
};

export function EntityRelationGraph({ entityName, relatedData, selectedNode, onNodeClick }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const onClickRef = useRef(onNodeClick);
  const { theme } = useTheme();
  // Sync the latest callback without causing re-renders (layout effect
  // runs synchronously after DOM mutations, before the browser paints).
  useLayoutEffect(() => {
    onClickRef.current = onNodeClick;
  });

  useEffect(() => {
    if (!containerRef.current || !relatedData) return;

    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, undefined, { renderer: 'svg' });
    }

    // Theme tokens, not per-category colours: the edge label already says
    // how a node relates, and DESIGN.md keeps colour for heat and selection.
    const accent = cssVar('--accent-blue');
    const tc = cssVar('--text-secondary');
    const tm = cssVar('--text-muted');
    const nodeFill = cssVar('--bg-elevated');
    const nodeBorder = tm;

    const nodes: any[] = [];
    const links: any[] = [];

    // Center node
    nodes.push({
      id: entityName,
      name: entityName,
      symbolSize: 52,
      fixed: true,
      x: 300, y: 180,
      itemStyle: { color: accent },
      label: { show: true, fontSize: 13, fontWeight: 'bold', color: cssVar('--on-accent'), position: 'inside' },
    });

    const pushGroup = (list: string[] | undefined, cat: number) => {
      const edgeLabel = EDGE_LABEL[cat];
      for (const name of list ?? []) {
        if (!name || name === entityName) continue;
        const isSelected = selectedNode === name;
        if (!nodes.find((n) => n.id === name)) {
          nodes.push({
            id: name,
            name,
            symbolSize: isSelected ? 38 : 28,
            itemStyle: {
              color: nodeFill,
              borderColor: isSelected ? accent : nodeBorder,
              borderWidth: isSelected ? 3 : 1.5,
            },
            label: { show: true, fontSize: 11, color: tc, position: 'bottom' },
          });
        }
        links.push({
          source: entityName,
          target: name,
          // Relation shows on hover; the groups are also listed under the graph.
          label: { show: false, formatter: edgeLabel, fontSize: 10, color: tm },
          lineStyle: { color: cssVar('--border-default'), width: 1.5, curveness: 0.12 },
        });
      }
    };

    pushGroup(relatedData.relatedCompanies, 1);
    pushGroup(relatedData.relatedModels, 2);
    pushGroup(relatedData.relatedProducts, 3);
    pushGroup(relatedData.competesWith, 4);

    chartRef.current.setOption(
      {
        backgroundColor: 'transparent',
        tooltip: {
          formatter: (p: any) =>
            p.dataType === 'node'
              ? `<b style="color:${cssVar('--text-primary')}">${p.data.name}</b>${p.data.id !== entityName ? `<br/><span style="color:${tm};font-size:11px">点击查看相关资讯</span>` : ''}`
              : `<span style="color:${tm}">${p.data.label?.formatter ?? ''}</span>`,
          backgroundColor: cssVar('--dropdown-bg'),
          borderColor: cssVar('--card-border'),
          extraCssText: 'border-radius:8px;padding:6px 10px;',
        },
        series: [
          {
            type: 'graph',
            layout: 'force',
            animation: true,
            animationDuration: 700,
            data: nodes,
            links,
            roam: 'move',
            draggable: true,
            force: {
              repulsion: 240,
              gravity: 0.04,
              edgeLength: [90, 160],
              friction: 0.65,
            },
            edgeSymbol: ['none', 'arrow'],
            edgeSymbolSize: [0, 8],
            edgeLabel: { show: false, fontSize: 10 },
            label: { position: 'bottom', fontSize: 11 },
            lineStyle: { width: 1.5 },
            emphasis: {
              focus: 'adjacency',
              scale: true,
              itemStyle: { borderWidth: 3 },
              lineStyle: { width: 2.5 },
              edgeLabel: { show: true },
            },
          },
        ],
      },
      true,
    );

    chartRef.current.off('click');
    chartRef.current.on('click', (p: any) => {
      if (p.dataType !== 'node') return;
      if (p.data.id === entityName) {
        onClickRef.current(null);
      } else {
        onClickRef.current(selectedNode === p.data.id ? null : p.data.id);
      }
    });

    // Capture ref value for cleanup to avoid stale ref in the closure.
    const chart = chartRef.current;
    return () => {
      chart.off('click');
    };
  }, [entityName, relatedData, selectedNode, theme]);

  useEffect(() => {
    const resize = () => chartRef.current?.resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  if (!relatedData) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
        正在生成关系图谱...
      </div>
    );
  }

  const hasNodes =
    [
      ...(relatedData.relatedCompanies ?? []),
      ...(relatedData.relatedModels ?? []),
      ...(relatedData.relatedProducts ?? []),
      ...(relatedData.competesWith ?? []),
    ].filter(Boolean).length > 0;

  if (!hasNodes) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-muted)] text-sm">
        暂无关联节点
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
}
