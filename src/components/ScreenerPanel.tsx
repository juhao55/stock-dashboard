import { ChangeEvent } from 'react';
import { Quote, ScreenerCriteria, StrategyId } from '../types';
import { formatAmountWan, formatMarketCapYi, formatPercent, formatPrice } from '../utils/format';
import { strategies } from '../utils/screener';

interface ScreenerPanelProps {
  criteria: ScreenerCriteria;
  sectors: string[];
  strategyId: StrategyId;
  results: Quote[];
  loading: boolean;
  onCriteriaChange: (criteria: ScreenerCriteria) => void;
  onStrategyChange: (strategyId: StrategyId) => void;
  onRun: () => void;
  onSelect: (quote: Quote) => void;
}

function toNumberOrUndefined(value: string): number | undefined {
  if (value.trim() === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function ScreenerPanel({
  criteria,
  sectors,
  strategyId,
  results,
  loading,
  onCriteriaChange,
  onStrategyChange,
  onRun,
  onSelect
}: ScreenerPanelProps) {
  const updateNumber = (key: keyof ScreenerCriteria) => (event: ChangeEvent<HTMLInputElement>) => {
    onCriteriaChange({ ...criteria, [key]: toNumberOrUndefined(event.target.value) });
  };

  return (
    <section className="panel screener-panel">
      <div className="panel-title">
        <h2>条件选股</h2>
        <button className="primary" onClick={onRun} disabled={loading}>{loading ? '筛选中...' : '运行选股'}</button>
      </div>

      <div className="strategy-row">
        {strategies.map((strategy) => (
          <button
            key={strategy.id}
            className={strategy.id === strategyId ? 'strategy active' : 'strategy'}
            onClick={() => onStrategyChange(strategy.id)}
            title={strategy.description}
          >
            {strategy.name}
          </button>
        ))}
      </div>

      <div className="form-grid">
        <label>
          板块
          <select value={criteria.sector} onChange={(event) => onCriteriaChange({ ...criteria, sector: event.target.value })}>
            {sectors.map((sector) => <option key={sector} value={sector}>{sector}</option>)}
          </select>
        </label>
        <label>
          涨幅 ≥ (%)
          <input type="number" step="0.1" value={criteria.minChangePct ?? ''} onChange={updateNumber('minChangePct')} />
        </label>
        <label>
          涨幅 ≤ (%)
          <input type="number" step="0.1" value={criteria.maxChangePct ?? ''} onChange={updateNumber('maxChangePct')} />
        </label>
        <label>
          PE ≤
          <input type="number" step="0.1" value={criteria.maxPe ?? ''} onChange={updateNumber('maxPe')} />
        </label>
        <label>
          换手率 ≥ (%)
          <input type="number" step="0.1" value={criteria.minTurnoverRate ?? ''} onChange={updateNumber('minTurnoverRate')} />
        </label>
        <label>
          量比 ≥
          <input type="number" step="0.1" value={criteria.minVolumeRatio ?? ''} onChange={updateNumber('minVolumeRatio')} />
        </label>
        <label>
          成交额 ≥ (万)
          <input type="number" step="100" value={criteria.minAmount ?? ''} onChange={updateNumber('minAmount')} />
        </label>
        <label>
          市值 ≥ (亿)
          <input type="number" step="10" value={criteria.minMarketCap ?? ''} onChange={updateNumber('minMarketCap')} />
        </label>
        <label>
          市值 ≤ (亿)
          <input type="number" step="10" value={criteria.maxMarketCap ?? ''} onChange={updateNumber('maxMarketCap')} />
        </label>
        <label>
          股息率 ≥ (%)
          <input type="number" step="0.1" value={criteria.minDividendYield ?? ''} onChange={updateNumber('minDividendYield')} />
        </label>
      </div>

      <div className="result-title">
        <h3>选股结果</h3>
        <span>{results.length} 只，按涨跌幅和成交额排序</span>
      </div>
      <div className="table-wrap result-wrap">
        <table>
          <thead>
            <tr>
              <th>代码</th>
              <th>名称</th>
              <th className="num">最新价</th>
              <th className="num">涨跌幅</th>
              <th className="num">量比</th>
              <th className="num">换手率</th>
              <th className="num">PE</th>
              <th className="num">股息率</th>
              <th className="num">成交额</th>
              <th className="num">市值</th>
            </tr>
          </thead>
          <tbody>
            {results.slice(0, 50).map((quote) => (
              <tr key={quote.code} onClick={() => onSelect(quote)}>
                <td>{quote.code}</td>
                <td className="name">{quote.name}</td>
                <td className={`num ${quote.changePct >= 0 ? 'up' : 'down'}`}>{formatPrice(quote.last)}</td>
                <td className={`num ${quote.changePct >= 0 ? 'up' : 'down'}`}>{formatPercent(quote.changePct)}</td>
                <td className="num">{quote.volumeRatio.toFixed(2)}</td>
                <td className="num">{quote.turnoverRate.toFixed(2)}%</td>
                <td className="num">{quote.pe.toFixed(1)}</td>
                <td className="num">{quote.dividendYield.toFixed(2)}%</td>
                <td className="num">{formatAmountWan(quote.amount)}</td>
                <td className="num">{formatMarketCapYi(quote.marketCap)}</td>
              </tr>
            ))}
            {results.length === 0 ? (
              <tr><td colSpan={10} className="empty-cell">暂无符合条件的结果，点击“运行选股”或放宽条件。</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
