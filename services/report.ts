import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

// ===== Colours =====
const C = {
  jade:    '#03695e',
  red:     '#c0392b',
  muted:   '#5a7068',
  ink:     '#1a2420',
  bg:      '#eaede3',
  bgLight: '#f9faf6',
  white:   '#ffffff',
  aqua:    '#239dca',
};

type Analysis = { id: number; type: 'init' | 'plaque'; status: string; created_at: string; result: any };
export type SnapItem = { label: string; img: string };

// ===== Helpers =====
function sec(title: string, body: string) {
  return `<div class="rpt-section"><div class="rpt-title">${title}</div>${body}</div>`;
}

function infoTable(rows: [string, string][]) {
  return `<table class="info-table">${rows.map(([k, v], i) =>
    `<tr${i % 2 === 0 ? ' class="even"' : ''}><td class="lbl">${k}</td><td class="val">${v}</td></tr>`
  ).join('')}</table>`;
}

function isUpper(fdi: string | number) {
  const n = Number(fdi); return n >= 11 && n <= 28;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-TW', {
    month: 'numeric', day: 'numeric',
  });
}

// expo-print does not render inline SVG reliably — encode as <img> data URI instead
function svgToImg(svgStr: string): string {
  return `<img src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}" style="width:100%;display:block;" />`;
}

// ===== Overall Trend SVG (整體趨勢，菌斑覆蓋率%) =====
function overallTrendSvg(sortedPlaque: any[]): string {
  if (sortedPlaque.length < 2) return '';
  const W = 500, H = 130, PL = 44, PR = 10, PT = 20, PB = 28;
  const cW = W - PL - PR, cH = H - PT - PB;
  const values = sortedPlaque.map(a => (a.result?.stats?.plaque_ratio ?? 0) * 100);
  const maxY   = 100;

  const toX = (i: number) => (i / (sortedPlaque.length - 1)) * cW;
  const toY = (v: number) => cH - (v / maxY) * cH;

  const gridLines = [0, 1, 2, 3, 4].map(i => {
    const v = maxY * i / 4;
    const y = toY(v);
    return `<line x1="${PL}" y1="${PT+y}" x2="${PL+cW}" y2="${PT+y}" stroke="${C.bg}" stroke-width="1.2"/>`
         + `<text x="${PL-4}" y="${PT+y+3}" font-size="9" fill="${C.muted}" text-anchor="end">${Math.round(v)}%</text>`;
  }).join('');

  const step = Math.max(1, Math.ceil(sortedPlaque.length / 6));
  const xTicks = sortedPlaque.map((a, i) => {
    if (i % step !== 0 && i !== sortedPlaque.length - 1) return '';
    return `<text x="${PL+toX(i)}" y="${PT+cH+18}" font-size="9" fill="${C.muted}" text-anchor="middle">${fmtDate(a.created_at)}</text>`;
  }).join('');

  const pts = sortedPlaque.map((_, i) => ({
    x: PL + toX(i), y: PT + toY(values[i]), v: values[i],
  }));

  const areaPoints = [
    `${pts[0].x},${PT+cH}`,
    ...pts.map(p => `${p.x},${p.y}`),
    `${pts[pts.length-1].x},${PT+cH}`,
  ].join(' ');
  const linePts = pts.map(p => `${p.x},${p.y}`).join(' ');

  const dots = pts.map(p =>
    `<circle cx="${p.x}" cy="${p.y}" r="4" fill="${C.aqua}"/>`
    + `<circle cx="${p.x}" cy="${p.y}" r="1.8" fill="white"/>`
    + `<text x="${p.x}" y="${p.y-9}" font-size="9" fill="${C.aqua}" text-anchor="middle">${p.v.toFixed(1)}%</text>`
  ).join('');

  const yAxisLabel =
    `<text transform="rotate(-90,12,${PT+cH/2})" x="12" y="${PT+cH/2+3}" font-size="9" fill="${C.muted}" text-anchor="middle">菌斑覆蓋率</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H+28}">
    <rect width="${W}" height="${H+28}" fill="white"/>
    ${gridLines}${yAxisLabel}
    <line x1="${PL}" y1="${PT+cH}" x2="${PL+cW}" y2="${PT+cH}" stroke="${C.muted}" stroke-width="0.5" opacity="0.35"/>
    ${xTicks}
    <polygon points="${areaPoints}" fill="${C.aqua}" fill-opacity="0.12"/>
    <polyline points="${linePts}" fill="none" stroke="${C.aqua}" stroke-width="2.5" stroke-linejoin="round"/>
    ${dots}
  </svg>`;

  return sec('菌斑趨勢（整體趨勢 · 全部）', `
    <div style="padding:8px 10px 2px">${svgToImg(svg)}</div>
    <p style="font-size:9px;color:${C.muted};text-align:center;padding:0 10px 8px">縱軸為菌斑覆蓋率（數值越低代表改善越多）</p>
  `);
}

// ===== Detail Trend SVG (上/下顎牙齒明細) =====
const TOOTH_COLORS = ['#03695e','#6daf5f','#239dca','#e8a020','#c0392b',
                      '#8e44ad','#2980b9','#27ae60','#d35400','#7f8c8d'];

function detailTrendSvg(sortedPlaque: any[], fdis: string[], title: string): string {
  if (!fdis.length || sortedPlaque.length < 2) return '';
  const W = 520, H = 110, PL = 44, PR = 10, PT = 12, PB = 22;
  const cW = W - PL - PR, cH = H - PT - PB;

  const allY  = sortedPlaque.flatMap(a => fdis.map(f =>
    a.result?.stats?.fdi_plaque_summary?.[f]?.total_plaque_px ?? 0
  ));
  const maxY  = Math.max(...allY, 1);
  const toX   = (i: number) => (i / (sortedPlaque.length - 1)) * cW;
  const toY   = (v: number) => cH - (v / maxY) * cH;
  const fmtY  = (v: number) => v >= 1000 ? `${(v/1000).toFixed(1)}k` : String(Math.round(v));

  const gridLines = [0, 1, 2, 3].map(i => {
    const v = maxY * i / 3, y = toY(v);
    return `<line x1="${PL}" y1="${PT+y}" x2="${PL+cW}" y2="${PT+y}" stroke="${C.bg}" stroke-width="1"/>
            <text x="${PL-4}" y="${PT+y+3}" font-size="8" fill="${C.muted}" text-anchor="end">${fmtY(v)}</text>`;
  }).join('');

  const step  = Math.max(1, Math.ceil(sortedPlaque.length / 6));
  const xTicks = sortedPlaque.map((a, i) => ({
    x: toX(i), show: i % step === 0 || i === sortedPlaque.length - 1,
    lbl: fmtDate(a.created_at),
  })).filter(t => t.show).map(t =>
    `<text x="${PL+t.x}" y="${PT+cH+14}" font-size="8" fill="${C.muted}" text-anchor="middle">${t.lbl}</text>`
  ).join('');

  const lines = fdis.map((fdi, idx) => {
    const color = TOOTH_COLORS[idx % TOOTH_COLORS.length];
    const pts   = sortedPlaque.map((a, i) => {
      const px = a.result?.stats?.fdi_plaque_summary?.[fdi]?.total_plaque_px ?? 0;
      return `${PL+toX(i)},${PT+toY(px)}`;
    }).join(' ');
    const dots = sortedPlaque.map((a, i) => {
      const px = a.result?.stats?.fdi_plaque_summary?.[fdi]?.total_plaque_px ?? 0;
      return `<circle cx="${PL+toX(i)}" cy="${PT+toY(px)}" r="3" fill="${color}"/>
              <circle cx="${PL+toX(i)}" cy="${PT+toY(px)}" r="1.5" fill="white"/>`;
    }).join('');
    return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.8" stroke-linejoin="round"/>
            ${dots}`;
  }).join('');

  const legendRows = Math.ceil(fdis.length / 8);
  const legendH    = legendRows * 14;
  const legendHtml = fdis.map((fdi, idx) => {
    const color = TOOTH_COLORS[idx % TOOTH_COLORS.length];
    const x     = (idx % 8) * 60 + PL;
    const y     = H + 12 + Math.floor(idx / 8) * 14;
    return `<rect x="${x}" y="${y}" width="10" height="6" rx="2" fill="${color}"/>
            <text x="${x+13}" y="${y+6}" font-size="8" fill="${C.muted}">FDI ${fdi}</text>`;
  }).join('');

  const totalH = H + 16 + legendH;
  const yAxisLabel =
    `<text transform="rotate(-90,13,${PT+cH/2})" x="13" y="${PT+cH/2+3}"
       font-size="9" fill="${C.muted}" text-anchor="middle">菌斑像素量</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${totalH}">
    <rect width="${W}" height="${totalH}" fill="white"/>
    ${gridLines}${yAxisLabel}
    <line x1="${PL}" y1="${PT+cH}" x2="${PL+cW}" y2="${PT+cH}" stroke="${C.muted}" stroke-width="0.5" opacity="0.35"/>
    ${xTicks}${lines}${legendHtml}
  </svg>`;

  return sec(title, `
    <div style="padding:8px 10px 2px">${svgToImg(svg)}</div>
    <p style="font-size:9px;color:${C.muted};text-align:center;padding:0 10px 8px">縱軸為菌斑像素量（數值越低代表改善越多）</p>
  `);
}

// ===== Main export =====
export async function exportMonthlyReport(
  analyses: Analysis[],
  snapshots?: SnapItem[] | null,
): Promise<void> {
  const now     = new Date();
  const dateStr = now.toISOString().slice(0, 10);

  const done       = analyses.filter(a => a.status === 'done' && a.result);
  const initList   = done.filter(a => a.type === 'init')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  const plaqueList = done.filter(a => a.type === 'plaque')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const latestInit   = initList[0]   ?? null;
  const latestPlaque = plaqueList[0] ?? null;

  // ===== 牙齒偵測摘要 =====
  let toothSection = '';
  if (latestInit?.result?.tooth_analysis) {
    const t     = latestInit.result.tooth_analysis;
    const never = (t.never_detected || []).join('、') || '無';
    toothSection = sec('牙齒偵測摘要', infoTable([
      ['偵測牙齒數', `${t.total_detected ?? '-'} 顆`],
      ['可靠偵測數', `${t.reliable_count ?? '-'} 顆`],
      ['未偵測到',   `${(t.never_detected || []).length} 顆`],
      ['缺牙列表',   never],
    ]));
  }

  // ===== 菌斑分析摘要 =====
  let plaqueSection = '';
  if (latestPlaque?.result?.stats) {
    const s     = latestPlaque.result.stats;
    const ratio = s.plaque_ratio != null ? `${(s.plaque_ratio * 100).toFixed(1)}%` : '-';
    plaqueSection = sec('菌斑分析摘要', infoTable([
      ['菌斑覆蓋率', ratio],
      ['有菌斑牙齒', `${Object.keys(s.fdi_plaque_summary || {}).length} 顆`],
      ['菌斑頂點數', `${s.plaque_vertices ?? '-'}`],
      ['總頂點數',   `${s.total_vertices  ?? '-'}`],
    ]));
  }

  // ===== 各顆牙齒菌斑量 =====
  let barSection = '';
  if (latestPlaque?.result?.stats?.fdi_plaque_summary) {
    const summary = latestPlaque.result.stats.fdi_plaque_summary;
    const sorted  = Object.entries(summary)
      .sort(([, a]: any, [, b]: any) => (b.total_plaque_px || 0) - (a.total_plaque_px || 0));
    const maxPx = (sorted[0] as any)?.[1]?.total_plaque_px || 1;
    const bars  = sorted.map(([fdi, info]: any) => {
      const pct = Math.round((info.total_plaque_px / maxPx) * 100);
      const jaw = isUpper(fdi) ? '上' : '下';
      return `<div class="bar-row">
        <div class="bar-lbl">${fdi}(${jaw})</div>
        <div class="bar-track"><div class="bar-track-inner"><div class="bar-fill" style="width:${pct}%"></div></div></div>
        <div class="bar-num">${info.total_plaque_px}px</div>
      </div>`;
    }).join('');
    barSection = sec('各顆牙齒菌斑量', `<div class="bar-chart">${bars}</div>`);
  }

  // ===== 趨勢圖 =====
  let trendSection = '';
  if (plaqueList.length >= 2) {
    const sortedPlaque = [...plaqueList].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const fdiSet = new Set<string>();
    sortedPlaque.forEach(a =>
      Object.keys(a.result?.stats?.fdi_plaque_summary || {}).forEach(k => fdiSet.add(k))
    );
    const allFdis   = Array.from(fdiSet).sort((a, b) => Number(a) - Number(b));
    const upperFdis = allFdis.filter(f => isUpper(f));
    const lowerFdis = allFdis.filter(f => !isUpper(f));

    trendSection = `<div style="padding-top:40px">` +
      overallTrendSvg(sortedPlaque) +
      (upperFdis.length ? detailTrendSvg(sortedPlaque, upperFdis, `上顎菌斑趨勢（FDI：${upperFdis.join('、')}）`) : '') +
      (lowerFdis.length ? detailTrendSvg(sortedPlaque, lowerFdis, `下顎菌斑趨勢（FDI：${lowerFdis.join('、')}）`) : '') +
      `</div>`;
  }

  // ===== 3D 菌斑模型截圖 =====
  let snapSection = '';
  if (snapshots && snapshots.length > 0) {
    const noSnap = `<div class="snap-placeholder"><span style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:9px;color:${C.muted}">截圖不可用</span></div>`;
    const cells  = snapshots.map(({ label, img }) => `
      <div class="snap-cell">
        ${img ? `<img src="${img}" class="snap-img"/>` : noSnap}
        <div class="snap-label">${label}</div>
      </div>
    `).join('');
    snapSection = `<div style="padding-top:40px">` + sec('3D 菌斑模型截圖', `
      <div class="snap-grid">${cells}</div>
      <p style="font-size:9px;color:${C.muted};padding:0 10px 8px">紅色區域為偵測到的菌斑位置</p>
    `) + `</div>`;
  }

  // ===== CSS =====
  const css = `
    @page { margin: 14mm 12mm; }
    * { margin:0; padding:0; box-sizing:border-box;
        -webkit-print-color-adjust:exact !important;
        print-color-adjust:exact !important; }
    body { font-family:-apple-system,"Noto Sans TC","PingFang TC","Heiti TC",sans-serif;
           color:${C.ink}; background:${C.white}; font-size:13px; line-height:1.6; }

    /* Header — use table layout for reliable flex-equivalent in WebKit print */
    .rpt-header { background:${C.jade}; color:${C.white};
      display:table; width:100%; table-layout:fixed;
      padding:13px 18px; margin-bottom:18px; border-radius:6px;
      -webkit-print-color-adjust:exact; }
    .rpt-header-left  { display:table-cell; vertical-align:middle; }
    .rpt-header-right { display:table-cell; vertical-align:middle; text-align:right; width:140px; }
    .rpt-header h1 { font-size:20px; font-weight:700; color:${C.white}; }
    .rpt-header .sub  { font-size:11px; color:rgba(255,255,255,0.85); margin-top:2px; }
    .rpt-header .date { font-size:13px; font-weight:600; color:${C.white}; }
    .rpt-header .disc { font-size:10px; color:rgba(255,255,255,0.8); margin-top:2px; }

    .rpt-section { margin-bottom:18px; page-break-inside:avoid; }
    .rpt-title { background:${C.bg}; color:${C.jade}; font-size:10.5px; font-weight:700;
      padding:4px 10px; border-radius:4px; margin-bottom:8px; letter-spacing:0.05em;
      -webkit-print-color-adjust:exact; }

    .info-table { width:100%; border-collapse:collapse; }
    .info-table tr.even { background:${C.bgLight}; -webkit-print-color-adjust:exact; }
    .info-table td { padding:5px 10px; font-size:12.5px; }
    .info-table td.lbl { color:${C.muted}; width:110px; }
    .info-table td.val { font-weight:600; color:${C.ink}; }

    /* Bar chart — inline-block trick avoids flex rendering issues in some WebKit versions */
    .bar-chart { display:block; }
    .bar-row   { display:table; width:100%; table-layout:fixed; height:20px; margin-bottom:3px; }
    .bar-lbl   { display:table-cell; width:52px; font-size:10.5px; color:${C.muted}; text-align:right;
                 padding-right:8px; vertical-align:middle; white-space:nowrap; }
    .bar-track { display:table-cell; vertical-align:middle; }
    .bar-track-inner { height:9px; background:${C.bg}; border-radius:5px; overflow:hidden;
                       -webkit-print-color-adjust:exact; }
    .bar-fill  { height:9px; background:${C.red}; border-radius:5px;
                 -webkit-print-color-adjust:exact; }
    .bar-num   { display:table-cell; width:60px; font-size:10.5px; color:${C.muted};
                 padding-left:8px; vertical-align:middle; white-space:nowrap; }

    .snap-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; padding:10px; }
    .snap-cell { text-align:center; page-break-inside:avoid; }
    .snap-img  { width:100%; height:200px; object-fit:cover; object-position:center center;
                 border-radius:6px; display:block; background:${C.bgLight};
                 -webkit-print-color-adjust:exact; }
    .snap-placeholder { width:100%; height:160px; background:${C.bgLight}; border-radius:6px;
      border:1px solid ${C.bg}; position:relative; -webkit-print-color-adjust:exact; }
    .snap-label { font-size:10px; color:${C.muted}; margin-top:5px; }

    .rpt-footer { text-align:center; font-size:9.5px; color:${C.muted};
      padding:10px 18px 18px; border-top:1px solid #dde2d6; margin-top:4px; }
  `;

  const html = `<!DOCTYPE html>
<html lang="zh-TW"><head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>${css}</style>
</head>
<body style="padding:16px 18px">
  <div class="rpt-header">
    <div class="rpt-header-left"><h1>Smile Guardian</h1><div class="sub">牙齒健康分析報告</div></div>
    <div class="rpt-header-right"><div class="date">${dateStr}</div><div class="disc">僅供參考，請諮詢牙醫師</div></div>
  </div>
  ${toothSection}
  ${plaqueSection}
  ${barSection}
  ${trendSection}
  ${snapSection}
  ${!toothSection && !plaqueSection
    ? `<div style="text-align:center;color:${C.muted};padding:40px 0;font-size:14px">尚無完成的分析記錄</div>`
    : ''}
  <div class="rpt-footer">Smile Guardian &nbsp;·&nbsp; ${dateStr} &nbsp;·&nbsp; 本報告僅供個人參考，實際診斷請諮詢專業牙醫師</div>
</body></html>`;

  const { uri } = await Print.printToFileAsync({ html, base64: false });
  await Sharing.shareAsync(uri, {
    mimeType:    'application/pdf',
    dialogTitle: 'Smile Guardian 牙齒健康分析報告',
    UTI:         'com.adobe.pdf',
  });
}
