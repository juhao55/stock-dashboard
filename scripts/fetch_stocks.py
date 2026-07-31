# 枚举全部沪深 A 股代码段，用腾讯 qt.gtimg.cn 批量反查名称，过滤有效股票。
# 腾讯该接口返回 GBK 编码、浏览器/手机可直连；此处用 urllib 抓取（绕过 Node fetch 的 socket 限制）。
import urllib.request, re, json, time

OUT = r'C:\Users\Administrator\WorkBuddy\2026-07-31-13-42-32\stock-dashboard-app\scripts\stocks.json'

def fetch_batch(codes):
    url = "https://qt.gtimg.cn/q=" + ",".join(codes)
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://gu.qq.com/"
    })
    data = urllib.request.urlopen(req, timeout=25).read().decode('gbk', 'ignore')
    out = {}
    for m in re.finditer(r'v_([a-z0-9]+)="([^"]*)"', data):
        code = m.group(1)
        f = m.group(2).split('~')
        # 真实 A 股有 50+ 字段；名称非空才算有效
        if len(f) >= 47 and f[1]:
            out[code] = f[1]
    return out

def gen_candidates():
    # 沪市主板
    for p in ['600', '601', '603', '604', '605']:
        for i in range(1000):
            yield 'sh' + p + '%03d' % i
    # 科创板
    for p in ['688', '689']:
        for i in range(1000):
            yield 'sh' + p + '%03d' % i
    # 深市主板
    for p in ['000', '001', '002', '003']:
        for i in range(1000):
            yield 'sz' + p + '%03d' % i
    # 创业板
    for p in ['300', '301']:
        for i in range(1000):
            yield 'sz' + p + '%03d' % i

codes = list(gen_candidates())
allres = {}
batch = 150
for i in range(0, len(codes), batch):
    seg = codes[i:i + batch]
    try:
        allres.update(fetch_batch(seg))
    except Exception as e:
        print('batch err', i, e)
    if (i // batch) % 20 == 0:
        print('progress', i, 'found', len(allres))
    time.sleep(0.05)

items = [{'code': c[2:], 'market': c[:2], 'name': n} for c, n in allres.items()]
items.sort(key=lambda x: (x['market'], x['code']))
json.dump(items, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False)
print('total valid stocks:', len(items))
