import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProviderConfig, Quote, ScreenerCriteria, StrategyId } from './types';
import { createProvider } from './data/provider';
import { DEFAULT_CORS_PROXY } from './data/proxy';
import { defaultCriteria, filterQuotes, strategies, uniqueSectors } from './utils/screener';
import { nowText } from './utils/format';
import { StatCards } from './components/StatCards';
import { SectorChart } from './components/SectorChart';
import { QuoteTable } from './components/QuoteTable';
import { StockChart } from './components/StockChart';
import { ScreenerPanel } from './components/ScreenerPanel';

const CONFIG_KEY = 'stock-dashboard-provider-config';

function loadConfig(): ProviderConfig {
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw) as ProviderConfig;
  } catch {
    // 忽略本地配置解析失败，回退到模拟行情
  }
  return { mode: 'mock', brokerBaseUrl: '', brokerToken: '', corsProxy: DEFAULT_CORS_PROXY };
}

export default function App() {
  const [config, setConfig] = useState<ProviderConfig>(loadConfig);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedCode, setSelectedCode] = useState('');
  const [criteria, setCriteria] = useState<ScreenerCriteria>(defaultCriteria);
  const [strategyId, setStrategyId] = useState<StrategyId>('all');
  const [results, setResults] = useState<Quote[]>([]);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('--');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mobileTab, setMobileTab] = useState<'market' | 'screener' | 'overview'>('market');

  const provider = useMemo(() => createProvider(config), [config]);
  const sectors = useMemo(() => uniqueSectors(quotes), [quotes]);
  const activeStrategy = strategies.find((item) => item.id === strategyId) ?? strategies[0];

  const runScreener = useCallback(() => {
    setResults(filterQuotes(quotes, criteria, strategyId));
  }, [quotes, criteria, strategyId]);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await provider.listQuotes();
      setQuotes(rows);
      setLastUpdated(nowText());
      setSelectedCode((current) => (rows.some((item) => item.code === current) ? current : rows[0]?.code ?? ''));
    } catch (err) {
      setError(err instanceof Error ? err.message : '行情加载失败');
    } finally {
      setLoading(false);
    }
  }, [provider]);

  useEffect(() => {
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  }, [config]);

  useEffect(() => {
    loadQuotes();
  }, [loadQuotes]);

  useEffect(() => {
    runScreener();
  }, [runScreener]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const timer = window.setInterval(loadQuotes, 5000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, loadQuotes]);

  const selectedQuote = quotes.find((quote) => quote.code === selectedCode) ?? quotes[0];

  const toggleWatch = (code: string) => {
    setWatchlist((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <p className="eyebrow">React + TypeScript + ECharts</p>
          <h1>股票看盘选股终端</h1>
          <p className="subtitle">红涨绿跌 · 条件选股 · 分时 / K线 · 券商行情接口适配</p>
        </div>
        <div className="header-actions">
          <label>
            数据源
            <select
              value={config.mode}
              onChange={(event) => setConfig({ ...config, mode: event.target.value as ProviderConfig['mode'] })}
            >
              <option value="mock">本地模拟行情</option>
              <option value="tencent-public">腾讯公开行情</option>
              <option value="sina-public">新浪公开行情</option>
              <option value="eastmoney-public">东方财富公开行情</option>
              <option value="broker-http">券商 HTTP 行情</option>
            </select>
          </label>
          {config.mode === 'broker-http' ? (
            <>
              <label className="wide-input">
                接口地址
                <input
                  placeholder="https://broker-api.example.com"
                  value={config.brokerBaseUrl ?? ''}
                  onChange={(event) => setConfig({ ...config, brokerBaseUrl: event.target.value })}
                />
              </label>
              <label>
                Token
                <input
                  placeholder="可选"
                  value={config.brokerToken ?? ''}
                  onChange={(event) => setConfig({ ...config, brokerToken: event.target.value })}
                />
              </label>
            </>
          ) : null}
          {config.mode === 'sina-public' || config.mode === 'eastmoney-public' ? (
            <label className="wide-input">
              CORS 代理
              <input
                placeholder={DEFAULT_CORS_PROXY}
                value={config.corsProxy ?? DEFAULT_CORS_PROXY}
                onChange={(event) => setConfig({ ...config, corsProxy: event.target.value })}
              />
            </label>
          ) : null}
          <label className="checkbox-label">
            <input type="checkbox" checked={autoRefresh} onChange={(event) => setAutoRefresh(event.target.checked)} />
            自动刷新
          </label>
          <button className="primary" onClick={loadQuotes} disabled={loading}>{loading ? '刷新中...' : '刷新行情'}</button>
        </div>
      </header>

      <div className="notice">
        可选数据源：本地模拟、腾讯公开行情（直连）、新浪公开行情（K线/分时 JSONP 直连，实时快照走 CORS 代理）、东方财富公开行情（走 CORS 代理）、券商 HTTP 行情。最后更新：{lastUpdated}
      </div>
      {error ? (
        <div className="error-box">
          {error}。腾讯可直连；新浪/东方财富需可用的 CORS 代理（新浪实时还需代理转发 Referer: finance.sina.com.cn）；也可切回本地模拟行情。
        </div>
      ) : null}

      <main className="layout">
        <section className={`tab-panel panel-market ${mobileTab === 'market' ? 'active' : ''}`}>
          <QuoteTable
            quotes={quotes}
            selectedCode={selectedQuote?.code}
            watchlist={watchlist}
            onSelect={(quote) => setSelectedCode(quote.code)}
            onToggleWatch={toggleWatch}
          />
          <StockChart provider={provider} quote={selectedQuote} />
        </section>

        <section className={`tab-panel panel-screener ${mobileTab === 'screener' ? 'active' : ''}`}>
          <ScreenerPanel
            criteria={criteria}
            sectors={sectors}
            strategyId={strategyId}
            results={results}
            loading={loading}
            onCriteriaChange={setCriteria}
            onStrategyChange={setStrategyId}
            onRun={runScreener}
            onSelect={(quote) => setSelectedCode(quote.code)}
          />
          <div className="strategy-note">
            当前策略：<strong>{activeStrategy.name}</strong>（{activeStrategy.description}）
          </div>
        </section>

        <section className={`tab-panel panel-overview ${mobileTab === 'overview' ? 'active' : ''}`}>
          <StatCards quotes={quotes} />
          <SectorChart quotes={quotes} />
        </section>
      </main>

      <nav className="tab-bar">
        <button
          type="button"
          className={`tab ${mobileTab === 'market' ? 'active' : ''}`}
          onClick={() => setMobileTab('market')}
        >
          <span className="tab-icon">📈</span>
          <span>行情</span>
        </button>
        <button
          type="button"
          className={`tab ${mobileTab === 'screener' ? 'active' : ''}`}
          onClick={() => setMobileTab('screener')}
        >
          <span className="tab-icon">🔍</span>
          <span>选股</span>
        </button>
        <button
          type="button"
          className={`tab ${mobileTab === 'overview' ? 'active' : ''}`}
          onClick={() => setMobileTab('overview')}
        >
          <span className="tab-icon">📊</span>
          <span>概览</span>
        </button>
      </nav>
    </div>
  );
}
