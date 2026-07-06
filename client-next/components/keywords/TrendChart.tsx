'use client';
import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { TrendPoint } from '../../services/api';

interface TrendChartProps {
  data: TrendPoint[];
  name: string;
}

export function TrendChart({ data, name }: TrendChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!chartRef.current) {
      chartRef.current = echarts.init(containerRef.current, undefined, { renderer: 'svg' });
    }
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const textColor = isDark ? '#8b8fa8' : '#4b5563';
    const lineColor = '#3b82f6';
    const areaColorStart = isDark ? 'rgba(59,130,246,0.25)' : 'rgba(59,130,246,0.15)';
    const gridLineColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';

    chartRef.current.setOption({
      backgroundColor: 'transparent',
      grid: { top: 12, right: 12, bottom: 28, left: 36 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: isDark ? '#0d0d20' : '#fff',
        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
        textStyle: { color: isDark ? '#e8eaf0' : '#1a1d2e', fontSize: 12 },
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
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: { color: lineColor, width: 2 },
          itemStyle: { color: lineColor },
          areaStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color: areaColorStart },
              { offset: 1, color: 'rgba(59,130,246,0)' },
            ]),
          },
        },
      ],
    });

    return () => {};
  }, [data, name]);

  useEffect(() => {
    const handleResize = () => chartRef.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return <div ref={containerRef} className="w-full h-full" />;
}
