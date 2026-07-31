import { ProviderConfig, QuoteProvider } from '../types';
import { BrokerHttpProvider } from './brokerHttpProvider';
import { EastMoneyQuoteProvider } from './eastmoneyProvider';
import { MockQuoteProvider } from './mockProvider';
import { SinaQuoteProvider } from './sinaProvider';
import { TencentQuoteProvider } from './tencentProvider';
import { DEFAULT_CORS_PROXY } from './proxy';

export function createProvider(config: ProviderConfig): QuoteProvider {
  if (config.mode === 'broker-http') {
    return new BrokerHttpProvider(config.brokerBaseUrl ?? '', config.brokerToken);
  }
  if (config.mode === 'sina-public') {
    return new SinaQuoteProvider(undefined, config.corsProxy || DEFAULT_CORS_PROXY);
  }
  if (config.mode === 'eastmoney-public') {
    return new EastMoneyQuoteProvider(undefined, config.corsProxy || DEFAULT_CORS_PROXY);
  }
  if (config.mode === 'tencent-public') {
    return new TencentQuoteProvider();
  }
  return new MockQuoteProvider();
}
