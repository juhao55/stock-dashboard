import { ProviderConfig, QuoteProvider } from '../types';
import { BrokerHttpProvider } from './brokerHttpProvider';
import { MockQuoteProvider } from './mockProvider';
import { TencentQuoteProvider } from './tencentProvider';

export function createProvider(config: ProviderConfig): QuoteProvider {
  if (config.mode === 'broker-http') {
    return new BrokerHttpProvider(config.brokerBaseUrl ?? '', config.brokerToken);
  }
  if (config.mode === 'tencent-public') {
    return new TencentQuoteProvider();
  }
  return new MockQuoteProvider();
}
