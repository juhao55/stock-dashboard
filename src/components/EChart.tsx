import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';

interface EChartProps {
  option: EChartsOption;
  height?: number;
  className?: string;
}

export function EChart({ option, height = 320, className }: EChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    chartRef.current = echarts.init(containerRef.current);
    const resizeObserver = new ResizeObserver(() => chartRef.current?.resize());
    resizeObserver.observe(containerRef.current);
    return () => {
      resizeObserver.disconnect();
      chartRef.current?.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    chartRef.current?.setOption(option, true);
  }, [option]);

  return <div ref={containerRef} className={className} style={{ width: '100%', height }} />;
}
