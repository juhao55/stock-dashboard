export function formatPrice(value: number): string {
  return value.toFixed(2);
}

export function formatPercent(value: number, digits = 2): string {
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
}

export function formatAmountWan(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(2)}亿`;
  return `${value.toFixed(0)}万`;
}

export function formatMarketCapYi(value: number): string {
  if (value >= 10000) return `${(value / 10000).toFixed(2)}万亿`;
  return `${value.toFixed(0)}亿`;
}

export function formatNumber(value: number, digits = 2): string {
  return Number.isFinite(value) ? value.toFixed(digits) : '--';
}

export function nowText(): string {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}
