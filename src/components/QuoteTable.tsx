import { Quote } from '../types';
import { formatAmountWan, formatMarketCapYi, formatPercent, formatPrice } from '../utils/format';

interface QuoteTableProps {
  quotes: Quote[];
  selectedCode?: string;
  watchlist: Set<string>;
  onSelect: (quote: Quote) => void;
  onToggleWatch: (code: string) => void;
}

export function QuoteTable({ quotes, selectedCode, watchlist, onSelect, onToggleWatch }: QuoteTableProps) {
  return (
    <section className="panel quote-panel">
      <div className="panel-title">
        <h2>行情列表</h2>
        <span>点击行查看分时 / K线</span>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>自选</th>
              <th>代码</th>
              <th>名称</th>
              <th className="num">最新价</th>
              <th className="num">涨跌幅</th>
              <th className="num">成交额</th>
              <th className="num">换手率</th>
              <th className="num">量比</th>
              <th className="num">PE</th>
              <th className="num">总市值</th>
              <th>板块</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((quote) => (
              <tr
                key={quote.code}
                className={quote.code === selectedCode ? 'selected' : ''}
                onClick={() => onSelect(quote)}
              >
                <td>
                  <button
                    className={watchlist.has(quote.code) ? 'watch active' : 'watch'}
                    onClick={(event) => {
                      event.stopPropagation();
                      onToggleWatch(quote.code);
                    }}
                    aria-label="加入自选"
                  >
                    ★
                  </button>
                </td>
                <td>{quote.code}</td>
                <td className="name">{quote.name}</td>
                <td className={`num ${quote.changePct >= 0 ? 'up' : 'down'}`}>{formatPrice(quote.last)}</td>
                <td className={`num ${quote.changePct >= 0 ? 'up' : 'down'}`}>{formatPercent(quote.changePct)}</td>
                <td className="num">{formatAmountWan(quote.amount)}</td>
                <td className="num">{quote.turnoverRate.toFixed(2)}%</td>
                <td className="num">{quote.volumeRatio.toFixed(2)}</td>
                <td className="num">{quote.pe.toFixed(1)}</td>
                <td className="num">{formatMarketCapYi(quote.marketCap)}</td>
                <td>{quote.sector}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
