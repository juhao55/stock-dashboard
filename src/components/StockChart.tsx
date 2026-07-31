import { useEffect, useMemo, useState } from 'react';
import type { EChartsOption } from 'echarts';
import { IntradayPoint, KlinePoint, Quote, QuoteProvider } from '../types';
import { formatPercent, formatPrice } from '../utils/format';
import { useMediaQuery } from '../utils/useMediaQuery';
import { EChart } from './EChart';

interface StockChartProps {
  provider: QuoteProvider;
  quote?: Quote;
}

export function StockChart({ provider, quote }: StockChartProps) {
  const [kline, setKline] = useState<KlinePoint[]>([]);
  const [intraday, setIntraday] = useState<IntradayPoint[]>([]);
  const [error, setError] = useState('');
  const narrow = useMediaQuery('(max-width: 859px)');
  const intradayHeight = narrow ? 190 : 250;
  const klineHeight = narrow ? 250 : 330;

  useEffect(() => {
    let alive = true;
    if (!quote) {
      setKline([]);
      setIntraday([]);
      return undefined;
    }
    setError('');
    Promise.all([provider.getKline(quote.code, 90), provider.getIntraday(quote.code)])
      .then(([klineRows, intradayRows]) => {
        if (!alive) return;
        setKline(klineRows);
        setIntraday(intradayRows);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : '图表数据加载失败');
      });
    return () => {
      alive = false;
    };
  }, [provider, quote]);

  const intradayOption = useMemo<EChartsOption>(() => {
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['分时价', '均价'], top: 0 },
      grid: { left: 48, right: 20, top: 34, bottom: 28 },
      xAxis: { type: 'category', data: intraday.map((item) => item.time) },
      yAxis: { scale: true, type: 'value' },
      series: [
        {
          name: '分时价',
          type: 'line',
          showSymbol: false,
          data: intraday.map((item) => item.price),
          lineStyle: { color: quote && quote.changePct >= 0 ? '#ef5350' : '#26a69a', width: 2 },
          areaStyle: { opacity: 0.08 }
        },
        {
          name: '均价',
          type: 'line',
          showSymbol: false,
          data: intraday.map((item) => item.avgPrice),
          lineStyle: { color: '#5b6b7f', width: 1 }
        }
      ]
    };
  }, [intraday, quote]);

  const klineOption = useMemo<EChartsOption>(() => {
    return {
      tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
      legend: { data: ['日K', '成交量'], top: 0 },
      grid: { left: 48, right: 20, top: 34, bottom: 28 },
      xAxis: { type: 'category', data: kline.map((item) => item.date) },
      yAxis: [{ scale: true, type: 'value' }, { scale: true, type: 'value', name: '量' }],
      dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 4 }],
      series: [
        {
          name: '日K',
          type: 'candlestick',
          data: kline.map((item) => [item.open, item.close, item.low, item.high]),
          itemStyle: {
            color: '#ef5350',
            color0: '#26a69a',
            borderColor: '#ef5350',
            borderColor0: '#26a69a'
          }
        },
        {
          name: '成交量',
          type: 'bar',
          yAxisIndex: 1,
          data: kline.map((item) => ({
            value: item.volume,
            itemStyle: { color: item.close >= item.open ? '#ef5350' : '#26a69a' }
          }))
        }
      ]
    };
  }, [kline]);

  if (!quote) {
    return <section className="panel chart-panel empty">请选择一只股票查看图表</section>;
  }

  return (
    <section className="panel chart-panel">
      <div className="panel-title stock-title">
        <div>
          <h2>{quote.name} <span>{quote.code}</span></h2>
          <p>
            <strong className={quote.changePct >= 0 ? 'up' : 'down'}>{formatPrice(quote.last)}</strong>
            <span className={quote.changePct >= 0 ? 'up' : 'down'}>{formatPercent(quote.changePct)}</span>
            <span>板块：{quote.sector}</span>
          </p>
        </div>
        <span className="timestamp">{quote.updatedAt}</span>
      </div>
      {error ? <div className="error-box">{error}</div> : null}
      <EChart option={intradayOption} height={intradayHeight} />
      <EChart option={klineOption} height={klineHeight} />
    </section>
  );
}
