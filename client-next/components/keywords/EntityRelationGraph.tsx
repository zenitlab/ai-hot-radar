'use client';
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { RelatedData } from '../../services/api';

interface Props {
  entityName: string;
  relatedData: RelatedData | null;
  selectedNode?: string | null;
  onNodeClick: (name: string | null) => void;
}

const CAT: Record<number, { color: string; label: string }> = {
  0: { color: '#3b82f6', label: '实体' },
  1: { color: '#10b981', label: '公司' },
  2: { color: '#8b5cf6', label: '模型' },
  3: { color: '#f59e0b', label: '产品' },
  4: { color: '#ef4444', label: '竞品' },
};

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
  onClickRef.current = onNodeClick;

  useEffect(() => {
    if (!containerRef.current || !relatedData) return;

    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, undefined, { renderer: 'svg' });
    }

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const tc = isDark ? '#c4c6d0' : '#374151';
    const tm = isDark ? '#8b8fa8' : '#9ca3af';

    const nodes: any[] = [];
    const links: any[] = [];

    // Center node
    nodes.push({
      id: entityName,
      name: entityName,
      symbolSize: 52,
      fixed: true,
      x: 300, y: 180,
      category: 0,
      itemStyle: { color: '#3b82f6', borderColor: '#93c5fd', borderWidth: 2.5 },
      label: { show: true, fontSize: 13, fontWeight: 'bold', color: '#fff', position: 'inside' },
    });

    const pushGroup = (list: string[] | undefined, cat: number) => {
      const { color } = CAT[cat];
      const edgeLabel = EDGE_LABEL[cat];
      for (const name of list ?? []) {
        if (!name || name === entityName) continue;
        const isSelected = selectedNode === name;
        if (!nodes.find((n) => n.id === name)) {
          nodes.push({
            id: name,
            name,
            symbolSize: isSelected ? 38 : 28,
            category: cat,
            itemStyle: {
              color: color + '22',
              borderColor: color,
              borderWidth: isSelected ? 3 : 1.5,
            },
            label: { show: true, fontSize: 11, color: tc, position: 'bottom' },
          });
        }
        links.push({
          source: entityName,
          target: name,
          label: { show: true, formatter: edgeLabel, fontSize: 9, color: tm },
          lineStyle: { color: color + '70', width: 1.5, curveness: 0.12 },
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
              ? `<b style="color:${isDark ? '#e8eaf0' : '#1a1d2e'}">${p.data.name}</b>${p.data.id !== entityName ? `<br/><span style="color:${tm};font-size:11px">点击查看相关资讯</span>` : ''}`
              : `<span style="color:${tm}">${p.data.label?.formatter ?? ''}</span>`,
          backgroundColor: isDark ? '#0d0d20' : '#fff',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
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
            categories: Object.values(CAT).map(({ label, color }) => ({ name: label, itemStyle: { color } })),
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
            edgeLabel: { show: true, fontSize: 9 },
            label: { position: 'bottom', fontSize: 11 },
            lineStyle: { width: 1.5 },
            emphasis: {
              focus: 'adjacency',
              scale: true,
              itemStyle: { borderWidth: 3 },
              lineStyle: { width: 2.5 },
            },
          },
        ],
        legend: {
          bottom: 4,
          left: 'center',
          data: Object.values(CAT).map((c) => c.label),
          textStyle: { color: tm, fontSize: 10 },
          itemWidth: 8,
          itemHeight: 8,
          icon: 'circle',
          itemGap: 10,
        },
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
  }, [entityName, relatedData, selectedNode]);

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
