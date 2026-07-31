import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { SearchBox } from './components/SearchBox';

const CONFIG_KEY = 'stock-dashboard-provider-config';

const MODE_LABEL: Record<ProviderConfig['mode'], string> = {
  mock: '本地模拟行情',
  'tencent-public': '腾讯公开行情',
  'sina-public': '新浪公开行情',
  'eastmoney-public': '东方财富',
  'broker-http': '券商 HTTP 接口'
};

function loadConfig(): ProviderConfig {
  try {
    const raw = window.localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw) as ProviderConfig;
  } catch {
    // 忽略本地配置解析失败，回退到模拟行情
  }
  return { mode: 'tencent-public', brokerBaseUrl: '', brokerToken: '', corsProxy: DEFAULT_CORS_PROXY };
}

export default function App() {
  const [config, setConfig] = useState<ProviderConfig>(loadConfig);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [extraQuotes, setExtraQuotes] = useState<Quote[]>([]);
  const extraRef = useRef<Quote[]>([]);
  useEffect(() => {
    extraRef.current = extraQuotes;
  }, [extraQuotes]);
  const [selectedCode, setSelectedCode] = useState('');
  const [criteria, setCriteria] = useState<ScreenerCriteria>(defaultCriteria);
  const [strategyId, setStrategyId] = useState<StrategyId>('all');
  const [results, setResults] = useState<Quote[]>([]);
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState('--');
  const [listSource, setListSource] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [mobileTab, setMobileTab] = useState<'market' | 'screener' | 'overview'>('market');
  const [searchError, setSearchError] = useState('');

  const provider = useMemo(() => createProvider(config), [config]);
  const combinedQuotes = useMemo(() => {
    const map = new Map<string, Quote>();
    quotes.forEach((item) => map.set(item.code, item));
    extraQuotes.forEach((item) => map.set(item.code, item));
    return Array.from(map.values());
  }, [quotes, extraQuotes]);
  const sectors = useMemo(() => uniqueSectors(combinedQuotes), [combinedQuotes]);
  const activeStrategy = strategies.find((item) => item.id === strategyId) ?? strategies[0];

  const runScreener = useCallback(() => {
    setResults(filterQuotes(combinedQuotes, criteria, strategyId));
  }, [combinedQuotes, criteria, strategyId]);

  const loadQuotes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await provider.listQuotes();
      setQuotes(rows);
      setLastUpdated(nowText());
      setListSource(provider.lastListSource ?? MODE_LABEL[config.mode]);
      setSelectedCode((current) => (rows.some((item) => item.code === current) ? current : rows[0]?.code ?? ''));
      // 已加入自选的股票也跟随刷新（按代码重新取实时行情）
      if (extraRef.current.length) {
        Promise.all(extraRef.current.map((item) => provider.getQuote(item.code).then((found) => found ?? item)))
          .then((updated) => setExtraQuotes(updated))
          .catch(() => undefined);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '行情加载失败');
    } finally {
      setLoading(false);
    }
  }, [provider, config.mode]);

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

  const selectedQuote = combinedQuotes.find((quote) => quote.code === selectedCode) ?? combinedQuotes[0];

  const toggleWatch = (code: string) => {
    setWatchlist((current) => {
      const next = new Set(current);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handlePick = useCallback(
    async (result: { code: string; name?: string }) => {
      setSearchError('');
      const code = result.code;
      if (combinedQuotes.some((item) => item.code === code)) {
        setSelectedCode(code);
        setMobileTab('market');
        return;
      }
      try {
        let quote = await provider.getQuote(code);
        if (!quote) {
          // 极端情况下取不到，用搜索返回的名称兜底，保证能加入列表
          quote = {
            code,
            name: result.name ?? code,
            sector: '自选',
            last: 0,
            prevClose: 0,
            open: 0,
            high: 0,
            low: 0,
            changePct: 0,
            volume: 0,
            amount: 0,
            turnoverRate: 0,
            volumeRatio: 1,
            pe: 0,
            pb: 0,
            marketCap: 0,
            dividendYield: 0,
            updatedAt: nowText()
          };
        }
        setExtraQuotes((current) => (current.some((item) => item.code === code) ? current : [...current, quote as Quote]));
        setSelectedCode(code);
        setMobileTab('market');
      } catch (err) {
        setSearchError(err instanceof Error ? err.message : '添加股票失败');
      }
    },
    [combinedQuotes, provider]
  );

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
        <span className="source-badge">当前数据源：<strong>{MODE_LABEL[config.mode]}</strong></span>
        {listSource ? <span className="source-detail">列表实际取自：{listSource}</span> : null}
        <span className="source-tip">腾讯列表/日K/分时均可浏览器直连；新浪/东方财富实时列表因跨域在浏览器中自动回退腾讯，K线/分时尽力直连（东方财富需代理）。最后更新：{lastUpdated}</span>
      </div>
      {error ? (
        <div className="error-box">
          {error}。默认「腾讯公开行情」可稳定直连；若切换新浪/东方财富后报错，多因公共 CORS 代理不通或限时，已自动回退腾讯；也可在「数据源」切回腾讯或本地模拟。
        </div>
      ) : null}
      {searchError ? <div className="error-box">{searchError}</div> : null}

      <main className="layout">
        <section className={`tab-panel panel-market ${mobileTab === 'market' ? 'active' : ''}`}>
          <SearchBox corsProxy={config.corsProxy ?? DEFAULT_CORS_PROXY} onPick={handlePick} />
          <QuoteTable
            quotes={combinedQuotes}
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
          <StatCards quotes={combinedQuotes} />
          <SectorChart quotes={combinedQuotes} />
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
