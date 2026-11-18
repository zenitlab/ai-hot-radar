"""
Stage-0 homepage mockups: three directions rendered from the same real data
(snapshot.json, pulled from aihotradar.com). Static HTML, no build step.

    python3 build.py   ->  a-radar.html, b-wire.html, c-morning.html, index.html
"""
import datetime as dt
import html
import json
import re
from pathlib import Path

HERE = Path(__file__).parent
snap = json.loads((HERE / 'snapshot.json').read_text(encoding='utf-8'))
LABELS = snap['labels']
STORIES = snap['stories']

# Company logos straight from the site's own icon map.
_brand_src = (HERE / '../../client-next/lib/brandIcons.ts').read_text(encoding='utf-8')
BRANDS = {k: json.loads(v) for k, v in re.findall(r'^\s*"([\w-]+)": ("(?:[^"\\]|\\.)*"),$', _brand_src, re.M)}

e = html.escape
BJ = dt.timezone(dt.timedelta(hours=8))
WEEK = '一二三四五六日'


def when(h):
    return dt.datetime.fromisoformat((h.get('publishedAt') or h['createdAt']).replace('Z', '+00:00')).astimezone(BJ)


def label(src):
    return LABELS.get(src) or src.replace('rss_', '').replace('_', ' ')


def title(h):
    return (h.get('overview') or {}).get('title') or h.get('titleZh') or h['title']


def coverage(h):
    s = STORIES.get(h.get('clusterKey') or '')
    return s['sources'] if s else [h['source']]


def day_heading(d):
    return f'{d.month}月{d.day}日 星期{WEEK[d.weekday()]}'


# Newest first, grouped by Beijing day; one item per event.
seen, feed = set(), []
for h in sorted(snap['curated'], key=when, reverse=True):
    k = h.get('clusterKey') or h['id']
    if k in seen:
        continue
    seen.add(k)
    feed.append(h)
days = {}
for h in feed:
    days.setdefault(when(h).date(), []).append(h)

trending = snap['trending']
digest = snap['digest']
companies = [t for t in snap['topics'] if t['group'] == 'company' and t['count'] > 0]
NOW = dt.datetime(2026, 11, 18, 0, 40, tzinfo=BJ)

NAV = [('精选', True), ('热点榜', False), ('日报', False), ('主题', False), ('全部动态', False)]
FOOT = ['Agent 接入', '更新日志', '关于', 'RSS']
TABS = ['精选', '热点', '日报', '主题', '关注']

ICON = {
    'search': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    'star': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/></svg>',
    'moon': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
}


def page(file, name, css, body, fonts=''):
    (HERE / file).write_text(f'''<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>样稿 {name} · AI 热点雷达</title>
{fonts}<style>{css}</style></head><body>{body}</body></html>''', encoding='utf-8')


# ───────────────────────── A · 雷达 ─────────────────────────
# Weather-radar heat scale is the one bold thing: it encodes how many outlets
# carry a story. Everything else is quiet sans on a cool grey-green ground.
HEAT = ['#5b8db0', '#4f9a6c', '#d6a72c', '#dd7a2c', '#c5381f']


HEAT_STEPS = [10, 20, 40, 70]  # heat index (heat × 10) where the colour steps up


def heat_color(index):
    return HEAT[sum(index >= s for s in HEAT_STEPS)]


def change(t):
    pct = t.get('changePct')
    if pct is None:
        return '<em>新上榜</em>'
    return f'<em class="{"up" if pct > 0 else ""}">{"+" if pct > 0 else ""}{pct}%</em>'


def a_radar():
    top = trending[:6]
    maxheat = max(t['heat'] for t in top) or 1
    rows = ''.join(
        f'''<li class="ev"><a href="#"><span class="bar"><i style="width:{max(8, t['heat'] / maxheat * 100):.0f}%;background:{heat_color(t['heat'] * 10)}"></i></span>
<span class="evt">{e(title(t))}</span>
<span class="evm"><b style="color:{heat_color(t['heat'] * 10)}">{round(t['heat'] * 10)}</b>{t['sourceCount']} 家来源{change(t)}</span></a></li>'''
        for t in top)
    feed_html = ''
    for d, items in list(days.items())[:2]:
        lis = ''
        for h in items[:12]:
            n = len(coverage(h))
            lis += f'''<li><time>{when(h):%H:%M}</time><span class="tick" style="background:{HEAT[min(4, n)] if n > 1 else 'transparent'}" title="{n} 家来源"></span>
<div><a href="#" class="t">{e(title(h))}</a><p>{e((h.get('summary') or '')[:90])}</p>
<span class="src">{e(label(h['source']))}{f'<b>等 {n} 家</b>' if n > 1 else ''}</span></div></li>'''
        feed_html += f'<section class="day"><h2>{day_heading(d)}</h2><ol class="feed">{lis}</ol></section>'
    brands = ''.join(f'<a href="#" title="{e(t["name"])}"><span>{BRANDS.get(t["slug"], "")}</span>{e(t["name"].split(" / ")[0])}</a>' for t in companies[:12])
    dg = ''.join(f'<li><a href="#">{e(x["title"])}</a></li>' for x in digest['highlights'][:4]) if digest else ''
    legend = ''.join(f'<i style="background:{c}"></i>' for c in HEAT)
    body = f'''
<header class="top"><div class="wrap">
<a class="logo" href="#"><svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="13" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="16" cy="16" r="7" fill="none" stroke="currentColor" stroke-width="2" opacity=".5"/><path d="M16 16 26 7" stroke="#dd7a2c" stroke-width="2.5" stroke-linecap="round"/><circle cx="16" cy="16" r="2.2" fill="currentColor"/></svg>AI 热点雷达</a>
<nav>{''.join(f'<a href="#" class="{"on" if on else ""}">{n}</a>' for n, on in NAV)}</nav>
<div class="tools"><button aria-label="搜索">{ICON['search']}</button><button aria-label="我的关注">{ICON['star']}</button><button aria-label="切换深色">{ICON['moon']}</button></div>
</div></header>
<main class="wrap grid">
<div>
<section class="now">
<div class="nowhead"><h1>此刻在发酵的事</h1><span class="legend">热度 低{legend}高</span></div>
<ol class="evs">{rows}</ol>
<a class="more" href="#">看完整热点榜</a>
</section>
{feed_html}
</div>
<aside>
<section class="card"><h3>今日日报</h3><p class="dd">{digest['date'][5:].replace('-', '月')}日，共 12 条</p><ol class="dgl">{dg}</ol><a class="more" href="#">读日报</a></section>
<section class="card"><h3>按公司看</h3><div class="brands">{brands}</div><a class="more" href="#">全部 37 个主题</a></section>
</aside>
</main>
<footer class="foot"><div class="wrap">{''.join(f'<a href="#">{f}</a>' for f in FOOT)}<span>每 30 分钟更新</span></div></footer>
<nav class="tabs">{''.join(f'<a href="#" class="{"on" if i == 0 else ""}">{t}</a>' for i, t in enumerate(TABS))}</nav>'''
    css = '''
:root{--bg:#f3f5f3;--panel:#fff;--ink:#17201d;--muted:#5f6b67;--faint:#8b9692;--rule:#dfe4e1;--pine:#1f6f5c}
*{box-sizing:border-box;margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font:15px/1.6 "Archivo","PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif;-webkit-font-smoothing:antialiased}
a{color:inherit;text-decoration:none}
.wrap{max-width:1180px;margin:0 auto;padding:0 24px}
.top{background:var(--panel);border-bottom:1px solid var(--rule);position:sticky;top:0;z-index:5}
.top .wrap{display:flex;align-items:center;gap:36px;height:60px}
.logo{display:flex;align-items:center;gap:10px;font-weight:700;font-size:18px;letter-spacing:.02em}
.logo svg{width:28px;height:28px;color:var(--pine)}
.top nav{display:flex;gap:4px}
.top nav a{padding:8px 12px;border-radius:8px;color:var(--muted);font-weight:500}
.top nav a:hover{color:var(--ink);background:var(--bg)}
.top nav a.on{color:var(--pine);font-weight:700}
.tools{margin-left:auto;display:flex;gap:4px}
.tools button{width:36px;height:36px;border:0;background:none;border-radius:8px;color:var(--muted);cursor:pointer;display:grid;place-items:center}
.tools button:hover{background:var(--bg);color:var(--ink)}
.tools svg{width:19px;height:19px}
.grid{display:grid;grid-template-columns:minmax(0,1fr) 320px;gap:40px;padding-top:28px;padding-bottom:48px}
.now{background:var(--panel);border:1px solid var(--rule);border-radius:14px;padding:22px 24px 18px;margin-bottom:36px}
.nowhead{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin-bottom:14px}
.now h1{font-size:22px;font-weight:700}
.legend{display:flex;align-items:center;gap:3px;font-size:12px;color:var(--faint)}
.legend i{width:14px;height:6px;border-radius:2px}
.evs{list-style:none}
.ev a{display:grid;grid-template-columns:120px minmax(0,1fr) auto;align-items:center;gap:16px;padding:11px 0;border-top:1px solid var(--rule)}
.ev:first-child a{border-top:0}
.ev a:hover .evt{color:var(--pine)}
.bar{height:8px;background:var(--bg);border-radius:4px;overflow:hidden}
.bar i{display:block;height:100%;border-radius:4px}
.evt{font-weight:600;font-size:16px;line-height:1.45}
.evm{font-size:13px;color:var(--muted);white-space:nowrap;display:flex;align-items:baseline;gap:10px}
.evm b{font-family:"Archivo",sans-serif;font-stretch:80%;font-weight:800;font-size:22px;min-width:30px;text-align:right;order:3}
.evm em{font-style:normal;color:var(--faint);font-size:12px}
.evm em.up{color:#c5381f}
.more{display:inline-block;margin-top:12px;font-size:14px;font-weight:600;color:var(--pine)}
.more:hover{text-decoration:underline}
.day h2{font-size:15px;font-weight:700;color:var(--muted);margin:0 0 6px}
.day{margin-bottom:28px}
.feed{list-style:none}
.feed li{display:grid;grid-template-columns:44px 10px minmax(0,1fr);gap:12px;padding:14px 0;border-bottom:1px solid var(--rule)}
.feed time{font-family:"Archivo",sans-serif;font-variant-numeric:tabular-nums;color:var(--faint);font-size:13px;padding-top:3px}
.tick{width:4px;height:100%;min-height:22px;border-radius:2px;justify-self:center}
.feed .t{font-size:17px;font-weight:600;line-height:1.5}
.feed .t:hover{color:var(--pine)}
.feed p{color:var(--muted);font-size:14px;margin-top:3px;display:-webkit-box;-webkit-line-clamp:1;-webkit-box-orient:vertical;overflow:hidden}
.src{display:block;font-size:13px;color:var(--faint);margin-top:4px}
.src b{font-weight:600;color:var(--muted);margin-left:8px}
aside{display:flex;flex-direction:column;gap:20px}
.card{background:var(--panel);border:1px solid var(--rule);border-radius:14px;padding:18px 20px}
.card h3{font-size:16px;font-weight:700}
.dd{font-size:13px;color:var(--faint);margin:2px 0 10px}
.dgl{padding-left:18px;font-size:14px;display:flex;flex-direction:column;gap:8px;color:var(--ink)}
.dgl a:hover{color:var(--pine)}
.brands{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:12px}
.brands a{display:flex;flex-direction:column;align-items:center;gap:6px;padding:10px 4px;border-radius:10px;font-size:12px;color:var(--muted);text-align:center}
.brands a:hover{background:var(--bg);color:var(--ink)}
.brands span{width:24px;height:24px;color:var(--ink)}
.foot{border-top:1px solid var(--rule);background:var(--panel);font-size:14px;color:var(--muted)}
.foot .wrap{display:flex;gap:24px;padding-top:20px;padding-bottom:20px;flex-wrap:wrap}
.foot span{margin-left:auto;color:var(--faint)}
.tabs{display:none}
@media (max-width:900px){.grid{grid-template-columns:1fr}.top nav{display:none}}
@media (max-width:640px){
.wrap{padding:0 16px}.top .wrap{height:54px}
.now{padding:16px;border-radius:12px}.now h1{font-size:19px}.legend{display:none}
.ev a{grid-template-columns:minmax(0,1fr) auto;row-gap:8px}.bar{grid-column:1/-1;order:3;height:6px}
.evt{font-size:15px}.feed li{grid-template-columns:40px 8px minmax(0,1fr);gap:10px}.feed .t{font-size:16px}
.tabs{display:flex;position:fixed;bottom:0;left:0;right:0;background:var(--panel);border-top:1px solid var(--rule);padding-bottom:env(safe-area-inset-bottom)}
.tabs a{flex:1;text-align:center;padding:12px 0;font-size:13px;color:var(--muted)}.tabs a.on{color:var(--pine);font-weight:700}
body{padding-bottom:56px}.foot span{margin-left:0}}
'''
    page('a-radar.html', 'A 雷达', css, body,
         '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,400..800&display=swap" rel="stylesheet">\n')


# ───────────────────────── B · 要闻 ─────────────────────────
# Web-news vernacular: plain white, real hyperlink blue that turns purple once
# read (a free "已读" state), "来源：标题" headlines with the other outlets'
# coverage indented beneath, like a wire desk. One family, no cards.
def b_wire():
    ranked = sorted(feed, key=lambda h: (len(coverage(h)), h.get('qualityScore') or 0), reverse=True)
    lead, rest = ranked[:6], ranked[6:22]

    def cluster(h, big=False):
        s = STORIES.get(h.get('clusterKey') or '')
        others = [r for r in (s['reports'] if s else []) if r['source'] != h['source']]
        seen_src, more = set(), []
        for r in others:
            if r['source'] in seen_src:
                continue
            seen_src.add(r['source'])
            more.append(f'<a href="#">{e(label(r["source"]))}</a>')
        also = f'<p class="also">还有 {"、".join(more)} 在报道</p>' if more else ''
        summ = f'<p class="sum">{e((h.get("summary") or "")[:120])}</p>' if big else ''
        return f'''<article class="{'big' if big else ''}"><p class="who">{e(label(h['source']))}<time>{when(h):%m月%d日 %H:%M}</time></p>
<h3><a href="#">{e(title(h))}</a></h3>{summ}{also}</article>'''

    hot = ''.join(f'<li><a href="#">{e(title(t))}</a><span>{t["sourceCount"]} 家来源</span></li>' for t in trending[:8])
    tops = '、'.join(f'<a href="#">{e(t["name"].split(" / ")[0])}</a>' for t in companies[:14])
    body = f'''
<header class="mast"><div class="wrap">
<a class="name" href="#">AI 热点雷达</a>
<nav>{''.join(f'<a href="#" class="{"on" if on else ""}">{n}</a>' for n, on in NAV)}</nav>
<form class="q"><input placeholder="搜索资讯"></form>
<a href="#" class="me">我的关注</a>
</div></header>
<main class="wrap cols">
<div class="main">
<h1 class="sr">精选</h1>
<p class="stamp">更新于 {NOW:%m月%d日 %H:%M}，按报道来源多少和评分排序</p>
{''.join(cluster(h, True) for h in lead)}
<h2 class="sect">更早的精选</h2>
{''.join(cluster(h) for h in rest)}
</div>
<aside>
<section><h2>热点榜</h2><ol class="hot">{hot}</ol><a href="#" class="lnk">完整榜单</a></section>
<section><h2>{digest['date'][5:7].lstrip('0')}月{digest['date'][8:].lstrip('0')}日 AI 日报</h2><ul class="dg">{''.join(f'<li><a href="#">{e(x["title"])}</a></li>' for x in digest['highlights'][:5])}</ul><a href="#" class="lnk">读全文</a></section>
<section><h2>主题</h2><p class="tops">{tops}</p></section>
</aside>
</main>
<footer class="wrap foot">{'　'.join(f'<a href="#">{f}</a>' for f in FOOT)}</footer>
<nav class="tabs">{''.join(f'<a href="#" class="{"on" if i == 0 else ""}">{t}</a>' for i, t in enumerate(TABS))}</nav>'''
    css = '''
:root{--ink:#1d1d1f;--muted:#5b5b60;--rule:#e3e3e6;--link:#1a4fb4;--visited:#6b3fa0}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;color:var(--ink);font:15px/1.65 -apple-system,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}
a{color:inherit;text-decoration:none}
.wrap{max-width:1120px;margin:0 auto;padding:0 24px}
.mast{border-bottom:2px solid var(--ink)}
.mast .wrap{display:flex;align-items:center;gap:28px;height:64px}
.name{font-size:22px;font-weight:800;letter-spacing:.04em}
.mast nav{display:flex;gap:20px;font-size:15px}
.mast nav a{color:var(--muted);padding:4px 0;border-bottom:2px solid transparent}
.mast nav a.on{color:var(--ink);font-weight:700;border-color:var(--ink)}
.mast nav a:hover{color:var(--ink)}
.q{margin-left:auto}.q input{width:200px;border:1px solid var(--rule);border-radius:6px;padding:7px 10px;font:inherit;font-size:14px}
.me{font-size:14px;color:var(--muted)}
.cols{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:48px;padding-top:20px;padding-bottom:40px}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}
.stamp{font-size:13px;color:var(--muted);margin-bottom:8px}
article{padding:14px 0;border-bottom:1px solid var(--rule)}
.who{font-size:13px;font-weight:700;color:var(--ink)}
.who time{font-weight:400;color:var(--muted);margin-left:10px}
article h3{font-size:16px;font-weight:600;line-height:1.5;margin-top:2px}
article.big h3{font-size:19px;font-weight:700}
article h3 a{color:var(--link)}article h3 a:visited{color:var(--visited)}article h3 a:hover{text-decoration:underline}
.sum{color:var(--muted);margin-top:4px;font-size:14.5px}
.also{margin-top:6px;padding-left:14px;border-left:3px solid var(--rule);font-size:13.5px;color:var(--muted)}
.also a{color:var(--link)}.also a:hover{text-decoration:underline}
.sect{font-size:14px;font-weight:700;margin:28px 0 0;padding-bottom:6px;border-bottom:2px solid var(--ink)}
aside section{margin-bottom:30px}
aside h2{font-size:15px;font-weight:800;padding-bottom:6px;border-bottom:2px solid var(--ink);margin-bottom:6px}
.hot{padding-left:22px;font-size:14.5px}
.hot li{padding:7px 0;border-bottom:1px solid var(--rule)}
.hot li::marker{font-weight:700;color:var(--muted)}
.hot a{color:var(--link)}.hot a:hover{text-decoration:underline}
.hot span{display:block;font-size:12.5px;color:var(--muted)}
.dg{list-style:none;font-size:14.5px}.dg li{padding:7px 0;border-bottom:1px solid var(--rule)}.dg a{color:var(--link)}
.lnk{display:inline-block;margin-top:8px;font-size:14px;font-weight:600}.lnk:hover{text-decoration:underline}
.tops{font-size:14.5px;line-height:2}.tops a{color:var(--link)}
.foot{border-top:1px solid var(--rule);padding-top:18px;padding-bottom:28px;font-size:14px;color:var(--muted)}
.tabs{display:none}
@media (max-width:900px){.cols{grid-template-columns:1fr}.mast nav,.q,.me{display:none}}
@media (max-width:640px){.wrap{padding:0 16px}.mast .wrap{height:54px}.name{font-size:19px}
article.big h3{font-size:17px}
.tabs{display:flex;position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid var(--rule)}
.tabs a{flex:1;text-align:center;padding:12px 0;font-size:13px;color:var(--muted)}.tabs a.on{color:var(--ink);font-weight:700}
body{padding-bottom:56px}}
'''
    page('b-wire.html', 'B 要闻', css, body)


# ───────────────────────── C · 晨报 ─────────────────────────
# The daily report opens the homepage, the way a morning paper's front page
# does: one big dateline, yesterday told in a paragraph, then the stories.
# Single column on white; seal red appears only on the dateline.
def c_morning():
    d0 = NOW.date()
    hl = digest['highlights']
    lead = ''.join(f'<li><a href="#">{e(x["title"])}</a></li>' for x in hl[:5])
    hot = ''.join(f'<li><a href="#"><span class="n">{t["sourceCount"]}</span>{e(title(t))}</a></li>' for t in trending[:3])
    feed_html = ''
    for d, items in list(days.items())[:2]:
        lis = ''.join(f'''<article><h3><a href="#">{e(title(h))}</a></h3><p>{e((h.get('summary') or '')[:110])}</p>
<p class="meta"><span>{e(label(h['source']))}</span><time>{when(h):%H:%M}</time>{f'<span class="m">{len(coverage(h))} 家来源</span>' if len(coverage(h)) > 1 else ''}</p></article>''' for h in items[:9])
        feed_html += f'<section class="day"><h2>{d.month}月{d.day}日</h2>{lis}</section>'
    brands = ''.join(f'<a href="#" title="{e(t["name"])}">{BRANDS.get(t["slug"], "")}</a>' for t in companies[:16])
    body = f'''
<header class="bar"><div class="col">
<a class="name" href="#">AI 热点雷达</a>
<nav>{''.join(f'<a href="#" class="{"on" if on else ""}">{n}</a>' for n, on in NAV)}</nav>
<button aria-label="搜索">{ICON['search']}</button>
</div></header>
<main class="col">
<section class="front">
<p class="date"><span class="seal">{d0.day}</span><span>{d0.year}年{d0.month}月<br>星期{WEEK[d0.weekday()]}</span></p>
<h1>昨天，AI 圈发生了这些事</h1>
<ol class="lead">{lead}</ol>
<a class="read" href="#">读完整日报，共 12 条</a>
</section>
<section class="hot"><h2>正在发酵</h2><ul>{hot}</ul></section>
{feed_html}
<section class="brands"><h2>按公司看</h2><div>{brands}</div></section>
</main>
<footer class="col foot">{''.join(f'<a href="#">{f}</a>' for f in FOOT)}</footer>
<nav class="tabs">{''.join(f'<a href="#" class="{"on" if i == 0 else ""}">{t}</a>' for i, t in enumerate(TABS))}</nav>'''
    css = '''
:root{--ink:#1f1f1f;--muted:#666;--faint:#999;--rule:#ececec;--seal:#b7282e}
*{box-sizing:border-box;margin:0;padding:0}
body{background:#fff;color:var(--ink);font:16px/1.7 -apple-system,"PingFang SC","Hiragino Sans GB","Microsoft YaHei",sans-serif}
a{color:inherit;text-decoration:none}
.serif,h1,h3,.lead,.name{font-family:"Songti SC","Noto Serif SC","Source Han Serif SC","STSong",serif}
.col{max-width:720px;margin:0 auto;padding:0 24px}
.bar{position:sticky;top:0;background:rgba(255,255,255,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--rule);z-index:5}
.bar .col{display:flex;align-items:center;gap:24px;height:58px;max-width:960px}
.name{font-size:20px;font-weight:900}
.bar nav{display:flex;gap:18px;font-size:15px;color:var(--muted)}
.bar nav a.on{color:var(--ink);font-weight:600}
.bar nav a:hover{color:var(--ink)}
.bar button{margin-left:auto;width:36px;height:36px;border:0;background:none;color:var(--muted);display:grid;place-items:center;cursor:pointer}
.bar button svg{width:19px;height:19px}
.front{padding:48px 0 36px;border-bottom:1px solid var(--rule)}
.date{display:flex;align-items:center;gap:14px;color:var(--muted);font-size:14px;line-height:1.4;margin-bottom:22px}
.seal{width:56px;height:56px;border:2px solid var(--seal);color:var(--seal);border-radius:6px;display:grid;place-items:center;font:700 30px/1 "Songti SC","Noto Serif SC",serif}
h1{font-size:34px;font-weight:900;line-height:1.3;letter-spacing:.01em}
.lead{margin:22px 0 0 1.4em;font-size:19px;line-height:1.6;display:flex;flex-direction:column;gap:12px}
.lead li::marker{color:var(--seal);font-weight:700}
.lead a:hover{text-decoration:underline;text-underline-offset:4px}
.read{display:inline-block;margin-top:24px;font-size:15px;font-weight:600;border-bottom:1.5px solid var(--ink);padding-bottom:1px}
.hot{padding:28px 0;border-bottom:1px solid var(--rule)}
h2{font-size:14px;font-weight:600;color:var(--muted);margin-bottom:12px}
.hot ul{list-style:none;display:flex;flex-direction:column;gap:10px}
.hot a{display:flex;gap:14px;align-items:baseline;font-size:17px;font-weight:500}
.hot a:hover{text-decoration:underline}
.n{flex:none;min-width:44px;font-size:13px;color:var(--seal);font-weight:700}
.n::after{content:" 家"}
.day{padding-top:32px}
.day h2{color:var(--ink);font-size:15px}
article{padding:16px 0;border-bottom:1px solid var(--rule)}
article h3{font-size:21px;font-weight:700;line-height:1.45}
article h3 a:hover{text-decoration:underline;text-underline-offset:4px}
article p{color:var(--muted);font-size:15px;margin-top:6px;line-height:1.75}
.meta{display:flex;gap:14px;font-size:13px!important;color:var(--faint)!important}
.meta .m{color:var(--seal)}
.brands{padding:36px 0 20px}
.brands div{display:flex;flex-wrap:wrap;gap:18px}
.brands a{width:28px;height:28px;opacity:.85}.brands a:hover{opacity:1}
.foot{display:flex;gap:22px;padding-top:24px;padding-bottom:40px;border-top:1px solid var(--rule);margin-top:24px;font-size:14px;color:var(--muted)}
.tabs{display:none}
@media (max-width:760px){.bar nav{display:none}}
@media (max-width:640px){.col{padding:0 16px}.front{padding:32px 0 28px}h1{font-size:27px}.lead{font-size:17px}
article h3{font-size:18px}
.tabs{display:flex;position:fixed;bottom:0;left:0;right:0;background:#fff;border-top:1px solid var(--rule)}
.tabs a{flex:1;text-align:center;padding:12px 0;font-size:13px;color:var(--muted)}.tabs a.on{color:var(--ink);font-weight:700}
body{padding-bottom:56px}}
'''
    page('c-morning.html', 'C 晨报', css, body)


a_radar()
b_wire()
c_morning()
(HERE / 'index.html').write_text('''<!doctype html><meta charset="utf-8"><title>首页样稿</title>
<style>body{font:16px/1.8 -apple-system,"PingFang SC",sans-serif;max-width:640px;margin:48px auto;padding:0 16px}a{color:#1a4fb4}</style>
<h1>首页样稿（阶段 0）</h1><p>三份样稿用的是同一批线上真实数据（2026-11-18 00:40 快照）。</p>
<ul><li><a href="a-radar.html">A 雷达</a>：热度色阶条显示几家在报道，右栏日报与公司图标</li>
<li><a href="b-wire.html">B 要闻</a>：网页新闻传统，蓝色链接读过变紫，同一事件的其他报道缩进在下面</li>
<li><a href="c-morning.html">C 晨报</a>：首页以日报开篇，单栏阅读，宋体标题</li></ul>''', encoding='utf-8')
print('ok', len(feed), 'events,', len(days), 'days')
