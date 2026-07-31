// 读取 scripts/stocks.json（腾讯抓取的有效沪深 A 股：code/market/name），
// 用 pinyin-pro 生成全拼，补充北交所精选龙头，输出为离线字典 src/data/stockDict.ts。
// 字典以 CSV 行字符串数组存储 + 运行时解析，规避巨型对象字面量引发的 TS2590。
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { pinyin } from 'pinyin-pro';

const __dirname = dirname(fileURLToPath(import.meta.url));
const items = JSON.parse(readFileSync(resolve(__dirname, 'stocks.json'), 'utf8'));

const seen = new Set();
const rows = [];
for (const it of items) {
  if (seen.has(it.code)) continue;
  seen.add(it.code);
  const py = pinyin(it.name, { toneType: 'none', type: 'array' }).join('').toLowerCase();
  rows.push({ code: it.code, market: it.market, name: it.name, py });
}

// 北交所精选龙头（东方财富把新三板与北交所混在一起，此处手工维护已知北交所标的）
const BJ = [
  ['835185', '贝特瑞'], ['835368', '连城数控'], ['836077', '吉林碳谷'], ['833819', '颖泰生物'],
  ['830799', '艾融软件'], ['832175', '东方碳素'], ['834599', '同力股份'], ['835640', '富士达'],
  ['836239', '长虹能源'], ['830946', '森萱医药'], ['832566', '梓橦宫'], ['833266', '生物谷'],
  ['833509', '同惠电子'], ['835179', '凯德石英'], ['835305', '云创数据'], ['836826', '盖世食品'],
  ['837212', '智新电子'], ['838262', '太湖雪'], ['871642', '通易航天'], ['833523', '德瑞锂电'],
  ['834033', '康普化学'], ['834415', '恒拓开源'], ['871970', '大禹生物'], ['872925', '锦好医疗'],
  ['873527', '夜光明'], ['873593', '鼎智科技'], ['430047', '诺思兰德'], ['832491', '奥迪威'],
  ['832225', '利通科技'], ['836892', '广咨国际'], ['837344', '三元基因'], ['838402', '硅烷科技'],
  ['832317', '观典防务'], ['830809', '安达科技']
];
for (const [code, name] of BJ) {
  if (seen.has(code)) continue;
  seen.add(code);
  const py = pinyin(name, { toneType: 'none', type: 'array' }).join('').toLowerCase();
  rows.push({ code, market: 'bj', name, py });
}

rows.sort((a, b) => a.market.localeCompare(b.market) || a.code.localeCompare(b.code));

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
const lines = rows.map((r) => `${r.code},${r.market},${esc(r.name)},${r.py}`);
const header = `// 自动生成（scripts/gen_dict.mjs），请勿手改。
// 覆盖全沪深 A 股（主板/科创板/创业板，由腾讯行情接口反查）+ 北交所精选龙头，用于离线搜索框联想。
// 运行时完全离线、无需任何 CORS 代理。数据以 CSV 行字符串数组存储，运行时解析；py 为名称全拼。

export interface DictStock {
  code: string; // 6 位纯数字
  market: 'sh' | 'sz' | 'bj';
  name: string;
  py: string; // 全拼
}

const RAW: string[] = [
${lines.map((l) => `  '${l}'`).join(',\n')}
];

export const STOCK_DICT: DictStock[] = RAW.map((line) => {
  const [code, market, name, py] = line.split(',');
  return { code, market: market as DictStock['market'], name, py };
});
`;
writeFileSync(resolve(__dirname, '..', 'src', 'data', 'stockDict.ts'), header);
console.log(`generated ${rows.length} stocks -> src/data/stockDict.ts`);
