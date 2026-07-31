import { Quote } from '../types';
import { formatAmountWan, formatPercent } from '../utils/format';

interface StatCardsProps {
  quotes: Quote[];
}

export function StatCards({ quotes }: StatCardsProps) {
  const up = quotes.filter((item) => item.changePct > 0).length;
  const down = quotes.filter((item) => item.changePct < 0).length;
  const flat = quotes.length - up - down;
  const totalAmount = quotes.reduce((sum, item) => sum + item.amount, 0);
  const avgChange = quotes.length ? quotes.reduce((sum, item) => sum + item.changePct, 0) / quotes.length : 0;

  return (
    <section className="stat-grid">
      <div className="stat-card">
        <span className="stat-label">上涨 / 下跌 / 平盘</span>
        <strong>
          <span className="up">{up}</span> / <span className="down">{down}</span> / {flat}
        </strong>
      </div>
      <div className="stat-card">
        <span className="stat-label">样本成交额</span>
        <strong>{formatAmountWan(totalAmount)}</strong>
      </div>
      <div className="stat-card">
        <span className="stat-label">平均涨跌幅</span>
        <strong className={avgChange >= 0 ? 'up' : 'down'}>{formatPercent(avgChange)}</strong>
      </div>
      <div className="stat-card">
        <span className="stat-label">覆盖标的</span>
        <strong>{quotes.length} 只</strong>
      </div>
    </section>
  );
}
