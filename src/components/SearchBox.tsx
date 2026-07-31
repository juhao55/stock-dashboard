import { useEffect, useRef, useState } from 'react';
import { normalizeCode, searchStocks, type SearchHit } from '../data/search';

interface SearchBoxProps {
  corsProxy: string;
  onPick: (result: { code: string; name?: string }) => void;
}

export function SearchBox({ corsProxy, onPick }: SearchBoxProps) {
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'empty'>('idle');
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const codeDirect = normalizeCode(query);

  useEffect(() => {
    const keyword = query.trim();
    if (!keyword) {
      setHits([]);
      setStatus('idle');
      return;
    }
    // 纯代码输入：无需联网，直接走腾讯行情接口添加，最稳妥
    if (codeDirect) {
      setHits([]);
      setStatus('idle');
      return;
    }
    const timer = window.setTimeout(async () => {
      setStatus('loading');
      try {
        const results = await searchStocks(keyword, corsProxy);
        if (results.length === 0) {
          setHits([]);
          setStatus('empty');
        } else {
          setHits(results);
          setStatus('idle');
        }
      } catch {
        setHits([]);
        setStatus('error');
      }
    }, 350);
    return () => window.clearTimeout(timer);
  }, [query, corsProxy, codeDirect]);

  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const addByCode = () => {
    if (!codeDirect) return;
    onPick({ code: codeDirect });
    setQuery('');
    setOpen(false);
  };

  const addByHit = (hit: SearchHit) => {
    onPick({ code: `${hit.market}${hit.code}`, name: hit.name });
    setQuery('');
    setHits([]);
    setOpen(false);
  };

  const showPanel = open && (codeDirect || hits.length > 0 || status !== 'idle');

  return (
    <div className="search-box" ref={boxRef}>
      <div className="search-input-row">
        <span className="search-icon">🔍</span>
        <input
          className="search-input"
          type="text"
          placeholder="搜索股票：输入代码(如 600519)或名称(如 茅台)"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && codeDirect) addByCode();
          }}
        />
        {query ? (
          <button type="button" className="search-clear" onClick={() => { setQuery(''); setHits([]); setStatus('idle'); }} aria-label="清空">
            ✕
          </button>
        ) : null}
      </div>

      {showPanel ? (
        <div className="search-panel">
          {codeDirect ? (
            <button type="button" className="search-hit code-hit" onClick={addByCode}>
              <span className="hit-main">按代码添加 <strong>{codeDirect.toUpperCase()}</strong></span>
              <span className="hit-sub">直连腾讯行情，无需代理，支持任意 A股/科创/北交所代码</span>
            </button>
          ) : null}

          {status === 'loading' ? <div className="search-msg">搜索中…</div> : null}
          {status === 'empty' ? <div className="search-msg">未找到匹配的股票，试试输入代码</div> : null}
          {status === 'error' ? (
            <div className="search-msg error">
              名称搜索需要可用的 CORS 代理（在「数据源」里填一个代理地址）。<br />
              更直接的方式：输入 6 位代码（如 600519）即可添加任意股票。
            </div>
          ) : null}

          {hits.map((hit) => (
            <button type="button" className="search-hit" key={`${hit.market}${hit.code}`} onClick={() => addByHit(hit)}>
              <span className="hit-main">
                {hit.name} <span className="hit-code">{hit.market.toUpperCase()}{hit.code}</span>
              </span>
              <span className="hit-sub">点击加入自选并查看行情</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
