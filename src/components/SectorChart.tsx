import { useMemo } from 'react';
import type { EChartsOption } from 'echarts';
import { Quote } from '../types';
import { formatAmountWan } from '../utils/format';
import { EChart } from './EChart';

interface SectorChartProps {
  quotes: Quote[];
}

export function SectorChart({ quotes }: SectorChartProps) {
  const sectorRows = useMemo(() => {
    const map = new Map<string, { sector: string; amount: number; changeSum: number; count: number }>();
    quotes.forEach((quote) => {
      const current = map.get(quote.sector) ?? { sector: quote.sector, amount: 0, changeSum: 0, count: 0 };
      current.amount += quote.amount;
      current.changeSum += quote.changePct;
      current.count += 1;
      map.set(quote.sector, current);
    });
    return Array.from(map.values())
      .map((item) => ({ ...item, avgChange: item.count ? item.changeSum / item.count : 0 }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 12);
  }, [quotes]);

  const pieOption: EChartsOption = {
    tooltip: { trigger: 'item', formatter: '{b}: {d}%' },
    legend: { bottom: 0, type: 'scroll' },
    series: [
      {
        name: '板块成交额',
        type: 'pie',
        radius: ['42%', '70%'],
        center: ['50%', '44%'],
        data: sectorRows.map((item) => ({ name: item.sector, value: Math.round(item.amount) }))
      }
    ]
  };

  const barOption: EChartsOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params) => {
        const first = Array.isArray(params) ? params[0] : params;
        return `${first.name}<br/>平均涨跌幅：${Number(first.value).toFixed(2)}%`;
      }
    },
    grid: { left: 42, right: 18, top: 24, bottom: 56 },
    xAxis: { type: 'category', data: sectorRows.map((item) => item.sector), axisLabel: { rotate: 32 } },
    yAxis: { type: 'value', name: '平均涨跌幅(%)' },
    series: [
      {
        name: '板块平均涨跌幅',
        type: 'bar',
        data: sectorRows.map((item) => ({
          value: Number(item.avgChange.toFixed(2)),
          itemStyle: { color: item.avgChange >= 0 ? '#ef5350' : '#26a69a' }
        }))
      }
    ]
  };

  return (
    <section className="panel sector-panel">
      <div className="panel-title">
        <h2>板块热力</h2>
        <span>成交额 TOP12 板块</span>
      </div>
      <div className="sector-grid">
        <EChart option={pieOption} height={300} />
        <EChart option={barOption} height={300} />
      </div>
      <div className="sector-summary">
        {sectorRows.slice(0, 4).map((item) => (
          <span key={item.sector} className={item.avgChange >= 0 ? 'up' : 'down'}>
            {item.sector} {item.avgChange >= 0 ? '+' : ''}{item.avgChange.toFixed(2)}% / {formatAmountWan(item.amount)}
          </span>
        ))}
      </div>
    </section>
  );
}
