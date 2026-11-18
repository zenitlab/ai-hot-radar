'use client';
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { TrendPoint } from '../../services/api';
import { cssVar } from '../../lib/cssVar';
import { useTheme } from '../../providers/ThemeProvider';

interface TrendChartProps {
  data: TrendPoint[];
  name: string;
}

export function TrendChart({ data, name }: TrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!containerRef.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, undefined, { renderer: 'svg' });
    }
    // Colours come from the theme tokens (DESIGN.md), read at draw time.
    const textColor = cssVar('--text-muted');
    const lineColor = cssVar('--accent-blue');
    const gridLineColor = cssVar('--border-subtle');

    chartRef.current.setOption({
      backgroundColor: 'transparent',
      grid: { top: 12, right: 12, bottom: 28, left: 36 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: cssVar('--dropdown-bg'),
        borderColor: cssVar('--card-border'),
        textStyle: { color: cssVar('--text-primary'), fontSize: 12 },
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params;
          return `${p.axisValue}<br/><b>${p.value}</b> 次提及`;
        },
      },
      xAxis: {
        type: 'category',
        data: data.map((d) => d.date.slice(5)), // MM-DD
        axisLabel: { color: textColor, fontSize: 11 },
        axisLine: { lineStyle: { color: gridLineColor } },
        axisTick: { show: false },
      },
      yAxis: {
        type: 'value',
        minInterval: 1,
        axisLabel: { color: textColor, fontSize: 11 },
        splitLine: { lineStyle: { color: gridLineColor } },
      },
      series: [
        {
          name,
          type: 'line',
          data: data.map((d) => d.count),
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: lineColor, width: 2 },
          itemStyle: { color: lineColor },
        },
      ],
    });

    return () => {};
  }, [data, name, theme]);

  useEffect(() => {
    const handleResize = () => chartRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
