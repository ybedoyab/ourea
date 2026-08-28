import { createPdf, jpegSofSize } from './pdfDocument.js';
import { assetUrl } from '../config/assetUrl.js';
import { formatUsd } from './costEstimate.js';
import { EARLY_ACTION } from './earlyAction.js';
import { cellSimulatorUrl } from './sessionLink.js';

const GOLD = [200, 167, 94];
const DARK = [17, 21, 23];
const INK = [28, 36, 40];
const MUTED = [92, 104, 108];
const CREAM = [247, 243, 234];
const CARD = [236, 230, 216];
const WHITE = [255, 255, 255];
const TYPE_COLORS = {
  rwh: [93, 145, 167],
  drainage: [200, 167, 94],
  restoration: [108, 152, 120],
};
const IMAGERY_BBOX = [-75.5426, 6.2489, -75.5351, 6.2564];
const ACTION_LEGEND = [
  { type: 'rwh', color: [93, 145, 167], label: 'Rainwater harvesting' },
  { type: 'drainage', color: [200, 167, 94], label: 'Drainage' },
  { type: 'restoration', color: [108, 152, 120], label: 'Restoration' },
];

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function scaleCmd(x, y, scale, commands) {
  return commands.map(([op, ...nums]) => {
    const mapped = [op];
    for (let i = 0; i < nums.length; i += 2) {
      mapped.push(x + nums[i] * scale, y + nums[i + 1] * scale);
    }
    return mapped;
  });
}

function drawLogo(pdf, x, y, scale = 0.72) {
  pdf.strokeCommands(scaleCmd(x, y, scale, [
    ['M', 8, 42], ['L', 24, 16], ['L', 32, 30], ['L', 42, 12], ['L', 56, 42],
  ]), { color: [238, 232, 220], lineWidth: 1.55 });
  pdf.strokeCommands(scaleCmd(x, y, scale, [
    ['M', 10, 46], ['C', 20, 42, 28, 50, 38, 44], ['C', 46, 40, 52, 46, 54, 44],
  ]), { color: GOLD, lineWidth: 1.15 });
}

function header(pdf, brief) {
  pdf.fillRect(0, 0, pdf.width, 64, DARK);
  pdf.fillRect(0, 64, pdf.width, 3, GOLD);
  drawLogo(pdf, 22, 8, 0.52);
  pdf.text('OUREA', 64, 12, { size: 8, bold: true, color: GOLD });
  pdf.text('Decision brief', 64, 26, { size: 14, bold: true, color: WHITE });
  pdf.text(brief.subtitle, 64, 44, { size: 9, color: [217, 189, 117] });
  pdf.text(formatDate(brief.generatedAt), pdf.width - 168, 26, { size: 9, color: [140, 153, 157] });
}

function footer(pdf, brief, page) {
  pdf.fillRect(0, pdf.height - 32, pdf.width, 32, DARK);
  pdf.text(brief.slogan, 40, pdf.height - 20, { size: 8, color: GOLD });
  pdf.text(`Page ${page} of 6`, pdf.width - 92, pdf.height - 20, { size: 8, color: [140, 153, 157] });
}

function startPage(pdf, brief, page) {
  pdf.fillRect(0, 0, pdf.width, pdf.height, CREAM);
  header(pdf, brief);
  footer(pdf, brief, page);
}

function briefPlan(brief) {
  return (brief.projects ?? []).map((item) => ({ cell_id: item.cell_id, type: item.type }));
}

function projectLink(brief, cellId) {
  if (!brief.simulatorUrl) return null;
  return cellSimulatorUrl(cellId, brief.simulatorUrl, briefPlan(brief));
}

function communityStatusLabel(status) {
  if (status === 'community_reviewed') return 'Community review recorded';
  if (status === 'requires_deliberation') return 'Needs deliberation';
  if (status === 'incomplete') return 'Incomplete review';
  return 'Not assessed';
}

function projectSite(lng, lat, frame, bbox) {
  const [west, south, east, north] = bbox;
  const u = (lng - west) / (east - west);
  const v = (north - lat) / (north - south);
  return [frame.x + 8 + u * (frame.w - 16), frame.y + 8 + v * (frame.h - 16)];
}

function drawFallbackMap(pdf, brief, x, y, width, height) {
  pdf.fillRect(x, y, width, height, DARK);
  const frame = { x, y, w: width, h: height };
  const bbox = brief.bbox?.length === 4 ? brief.bbox : IMAGERY_BBOX;
  (brief.sites ?? []).forEach((site) => {
    if (!site.ring?.length) return;
    const points = site.ring.map((point) => projectSite(point[0], point[1], frame, bbox));
    pdf.strokePath(points, {
      color: site.type ? (TYPE_COLORS[site.type] ?? GOLD) : [80, 90, 94],
      lineWidth: site.type ? 1.6 : 0.5,
    });
  });
  pdf.text('Llanaditas planning cells', x + 10, y + 8, { size: 9, bold: true, color: GOLD });
}

function drawHouse(pdf, x, y, scale = 1) {
  const w = 7 * scale;
  const h = 8 * scale;
  pdf.fillRect(x - w / 2, y - h, w, h, [216, 208, 196]);
  pdf.strokePath([
    [x - w / 2 - 1, y - h],
    [x, y - h - 5 * scale],
    [x + w / 2 + 1, y - h],
  ], { color: [61, 70, 74], lineWidth: 0.8 });
}

function drawMechanism(pdf, x, y, width, height) {
  const gap = 8;
  const frameW = (width - gap * 3) / 4;
  EARLY_ACTION.frames.forEach((frame, index) => {
    const fx = x + index * (frameW + gap);
    pdf.fillRect(fx, y, frameW, height, DARK);
    pdf.fillRect(fx + 6, y + 36, frameW - 12, height - 58, index === 3 ? [61, 83, 72] : [90, 74, 64]);
    drawHouse(pdf, fx + frameW * 0.28, y + height - 28, 1.1);
    drawHouse(pdf, fx + frameW * 0.52, y + height - 34, 1.1);
    drawHouse(pdf, fx + frameW * 0.76, y + height - 40, 1.1);
    if (index === 0) {
      pdf.fillCircle(fx + frameW - 18, y + 22, 8, [138, 164, 176]);
    }
    if (index === 1) {
      pdf.strokePath([
        [fx + 12, y + 48],
        [fx + frameW - 14, y + height - 18],
      ], { color: [126, 167, 194], lineWidth: 2 });
    }
    if (index === 2) {
      pdf.strokePath([
        [fx + 14, y + 58],
        [fx + frameW * 0.45, y + 78],
        [fx + frameW - 12, y + height - 16],
      ], { color: [196, 165, 116], lineWidth: 1.2 });
    }
    if (index === 3) {
      pdf.strokePath([
        [fx + 10, y + 52],
        [fx + frameW - 12, y + height - 22],
      ], { color: GOLD, lineWidth: 2 });
      pdf.fillRect(fx + 18, y + 50, 7, 9, [93, 145, 167]);
    }
    pdf.text(`${frame.step}. ${frame.title}`, fx + 6, y + 8, {
      size: 7,
      bold: true,
      color: GOLD,
      maxWidth: frameW - 12,
    });
  });
}

const loadImage = typeof Image === 'undefined'
  ? async () => null
  : (url) => new Promise((resolve) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });

export async function renderSitePlate(brief) {
  if (typeof document === 'undefined') return null;
  const sites = brief.sites ?? [];
  if (!sites.length) return null;
  const width = 1600;
  const height = 900;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const aerial = await loadImage(assetUrl('data/llanaditas_imagery.jpg'));
  if (aerial) ctx.drawImage(aerial, 0, 0, width, height);
  else {
    ctx.fillStyle = '#12181b';
    ctx.fillRect(0, 0, width, height);
  }
  const frame = { x: 0, y: 0, w: width, h: height };
  const bbox = IMAGERY_BBOX;
  sites.forEach((site) => {
    if (!site.ring?.length) return;
    ctx.beginPath();
    site.ring.forEach((point, index) => {
      const [px, py] = projectSite(point[0], point[1], frame, bbox);
      if (index === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.closePath();
    if (site.type) {
      ctx.fillStyle = `rgba(${(TYPE_COLORS[site.type] ?? GOLD).join(',')}, 0.42)`;
      ctx.fill();
      ctx.strokeStyle = '#f6f1e6';
      ctx.lineWidth = 2.2;
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    }
  });
  ctx.fillStyle = 'rgba(17,21,23,0.78)';
  ctx.fillRect(0, 0, width, 48);
  ctx.fillStyle = '#d9bd75';
  ctx.font = '700 16px Inter, system-ui, sans-serif';
  ctx.fillText('Llanaditas / Upper Comuna 8, Medellín', 24, 30);
  const present = new Set(sites.filter((site) => site.type).map((site) => site.type));
  ctx.fillStyle = 'rgba(17,21,23,0.78)';
  ctx.fillRect(0, height - 44, width, 44);
  ACTION_LEGEND.filter((item) => present.has(item.type)).forEach((item, index) => {
    ctx.fillStyle = `rgb(${item.color.join(',')})`;
    ctx.beginPath();
    ctx.arc(28 + index * 220, height - 22, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eee8dc';
    ctx.font = '14px Inter, system-ui, sans-serif';
    ctx.fillText(item.label, 42 + index * 220, height - 17);
  });
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  const bytes = Uint8Array.from(atob(dataUrl.split(',')[1]), (char) => char.charCodeAt(0));
  const size = jpegSofSize(bytes);
  return { bytes, width: size?.width ?? width, height: size?.height ?? height };
}

function pageExecutive(pdf, brief) {
  startPage(pdf, brief, 1);
  let y = 84;
  pdf.text('Executive decision', 40, y, { size: 16, bold: true, color: INK });
  y += 22;
  pdf.text(`Ourea  ·  ${brief.subtitle} proving ground  ·  ${brief.city}`, 40, y, {
    size: 10,
    color: MUTED,
    maxWidth: 515,
  });
  y += 20;
  pdf.text('Decision requested', 40, y, { size: 8, bold: true, color: GOLD });
  y += 12;
  y += pdf.text(brief.decisionRequested, 40, y, { size: 11, color: INK, maxWidth: 515 });
  y += 10;
  pdf.fillRect(40, y, 515, 52, CARD);
  pdf.text('Selected portfolio', 52, y + 8, { size: 8, bold: true, color: GOLD });
  pdf.text(brief.recommendation, 52, y + 24, { size: 11, bold: true, color: INK, maxWidth: 490 });
  y += 64;
  const costing = brief.costing;
  const total = costing?.display?.total;
  pdf.fillRect(40, y, 515, 88, DARK);
  pdf.text('Preliminary implementation envelope', 52, y + 10, { size: 8, bold: true, color: GOLD });
  pdf.text(total ? `${formatUsd(total.low)} – ${formatUsd(total.high)}` : 'Not estimable', 52, y + 28, {
    size: 18,
    bold: true,
    color: WHITE,
  });
  pdf.text(
    total
      ? `Base ${formatUsd(total.base)}  ·  Confidence: pre-feasibility`
      : 'At least one selected intervention has no estimable scenario.',
    52,
    y + 54,
    { size: 10, color: [217, 189, 117], maxWidth: 490 },
  );
  y += 102;
  ['Low', 'Base', 'High'].forEach((label, index) => {
    const key = label.toLowerCase();
    const x = 40 + index * 172;
    pdf.fillRect(x, y, 164, 48, CARD);
    pdf.text(label, x + 10, y + 8, { size: 8, bold: true, color: GOLD });
    pdf.text(total ? formatUsd(total[key]) : '—', x + 10, y + 24, { size: 12, bold: true, color: INK });
  });
  y += 62;
  pdf.text('Main cost driver', 40, y, { size: 8, bold: true, color: GOLD });
  y += 12;
  pdf.text(costing?.costDriver ?? 'Quantity assumptions still bound the envelope.', 40, y, {
    size: 11,
    color: INK,
    maxWidth: 515,
  });
  y += 28;
  pdf.text(
    `FX ${brief.costing?.fx?.cop_per_usd ?? '—'} COP/USD on ${brief.costing?.fx?.date ?? brief.costing?.priceDate ?? '—'}. Amounts in US$. This envelope is pre-feasibility, not a contract.`,
    40,
    y,
    { size: 9, color: MUTED, maxWidth: 515 },
  );
}

function pageWhere(pdf, brief) {
  startPage(pdf, brief, 2);
  let y = 84;
  pdf.text('Where and what', 40, y, { size: 16, bold: true, color: INK });
  y += 22;
  const image = brief.siteImage;
  if (image?.bytes) {
    const size = jpegSofSize(image.bytes) ?? { width: image.width, height: image.height };
    const displayWidth = 515;
    const displayHeight = Math.min(248, displayWidth * (size.height / size.width));
    pdf.addJpeg({
      bytes: image.bytes,
      width: size.width,
      height: size.height,
      x: 40,
      y,
      displayWidth,
      displayHeight,
    });
    y += displayHeight + 10;
  } else {
    drawFallbackMap(pdf, brief, 40, y, 515, 168);
    y += 178;
  }
  pdf.text('Each square is an 80 m planning cell. Links open the same cell in Ourea, Google Maps or Google Earth.', 40, y, {
    size: 9,
    color: MUTED,
    maxWidth: 515,
  });
  y += 18;
  (brief.projects ?? []).forEach((project) => {
    const link = projectLink(brief, project.cell_id);
    pdf.fillRect(40, y, 515, 62, CARD);
    pdf.fillRect(40, y, 6, 62, TYPE_COLORS[project.type] ?? GOLD);
    pdf.text(`Cell ${project.cell_id}  ·  ${project.label}`, 56, y + 8, { size: 11, bold: true, color: INK });
    pdf.text(project.quantityLabel, 56, y + 24, { size: 9, color: MUTED, maxWidth: 480 });
    const items = [
      link ? ['Ourea map', link] : null,
      project.mapsUrl ? ['Google Maps', project.mapsUrl] : null,
      project.earthUrl ? ['Google Earth', project.earthUrl] : null,
    ].filter(Boolean);
    items.forEach((item, index) => {
      const x = 56 + index * 150;
      pdf.text(item[0], x, y + 42, { size: 9, bold: true, color: GOLD });
      pdf.addLink(x - 2, y + 40, 140, 14, item[1]);
    });
    y += 70;
  });
}

function pageCost(pdf, brief) {
  startPage(pdf, brief, 3);
  let y = 84;
  pdf.text('Cost envelope', 40, y, { size: 16, bold: true, color: INK });
  y += 20;
  pdf.text('Pre-feasibility US$ range. Not an offer, contract or engineering estimate.', 40, y, {
    size: 9,
    color: MUTED,
    maxWidth: 515,
  });
  y += 16;
  const cols = [40, 168, 268, 338, 408, 478];
  ['Intervention', 'Assumed quantity', 'Low', 'Base', 'High', 'Evidence'].forEach((label, index) => {
    pdf.text(label, cols[index], y, { size: 7, bold: true, color: GOLD });
  });
  y += 14;
  (brief.costing?.lines ?? []).forEach((line) => {
    pdf.text(line.label, cols[0], y, { size: 8, color: INK, maxWidth: 124 });
    pdf.text(line.quantityLabel, cols[1], y, { size: 8, color: INK, maxWidth: 96 });
    pdf.text(formatUsd(line.display.low), cols[2], y, { size: 8, color: INK });
    pdf.text(formatUsd(line.display.base), cols[3], y, { size: 8, color: INK });
    pdf.text(formatUsd(line.display.high), cols[4], y, { size: 8, color: INK });
    pdf.text(line.evidenceTier, cols[5], y, { size: 8, color: INK, maxWidth: 72 });
    y += 12;
    pdf.text(`Source ${line.sourceIds?.[0] ?? '—'}`, cols[0], y, { size: 7, color: MUTED, maxWidth: 515 });
    y += 14;
  });
  y += 6;
  const display = brief.costing?.display;
  const rows = [
    ['Construction subtotal', display?.construction],
    display?.equipment && (display.equipment.base || display.equipment.high)
      ? ['Known equipment', display.equipment]
      : null,
    ['Design allowance', display?.design],
    ['Total envelope', display?.total],
  ].filter(Boolean);
  rows.forEach(([label, value], index) => {
    const bold = label === 'Total envelope';
    y += pdf.text(label, 40, y, { size: 10, bold, color: INK });
    pdf.text(value ? `${formatUsd(value.low)} / ${formatUsd(value.base)} / ${formatUsd(value.high)}` : '—', 250, y - 14, {
      size: 10,
      bold,
      color: INK,
    });
    y += 4;
  });
  y += 8;
  const drainage = (brief.projects ?? []).find((item) => item.type === 'drainage');
  if (drainage) {
    y += pdf.text(drainage.quantityBasis, 40, y, { size: 9, color: MUTED, maxWidth: 515 });
    y += 6;
  }
  y += pdf.text(
    `FX and price date: ${brief.costing?.fx?.cop_per_usd ?? '—'} COP per USD on ${brief.costing?.fx?.date ?? '—'} (${brief.costing?.fx?.id ?? 'TRM'}).`,
    40,
    y,
    { size: 9, color: INK, maxWidth: 515 },
  );
  y += 6;
  y += pdf.text(`Included: ${(brief.costing?.included ?? []).join('; ') || 'see sources'}.`, 40, y, {
    size: 9,
    color: INK,
    maxWidth: 515,
  });
  y += 6;
  y += pdf.text(`Excluded: ${(brief.costing?.excluded ?? []).join('; ')}.`, 40, y, {
    size: 9,
    color: INK,
    maxWidth: 515,
  });
}

function pagePathway(pdf, brief) {
  startPage(pdf, brief, 4);
  let y = 84;
  pdf.text('Six-month implementation pathway', 40, y, { size: 16, bold: true, color: INK });
  y += 20;
  pdf.text('This is decision preparation, not a promise that a hydraulic corridor is built in six months.', 40, y, {
    size: 9,
    color: MUTED,
    maxWidth: 515,
  });
  y += 16;
  (brief.pathway ?? []).forEach((step, index) => {
    pdf.fillRect(40, y, 22, 22, GOLD);
    pdf.text(String(index + 1), 47, y + 5, { size: 10, bold: true, color: DARK });
    pdf.text(step.title, 70, y + 4, { size: 11, bold: true, color: INK, maxWidth: 470 });
    y += 22;
    y += pdf.text(step.body, 70, y, { size: 9, color: INK, maxWidth: 470 });
    y += 10;
  });
}

function pageRobustness(pdf, brief) {
  startPage(pdf, brief, 5);
  let y = 84;
  pdf.text('Robustness, impact and safeguards', 40, y, { size: 16, bold: true, color: INK });
  y += 22;
  y += pdf.text(brief.robustness, 40, y, { size: 11, color: INK, maxWidth: 515 });
  y += 10;
  const chips = [
    ['Cells', String(brief.footprint.cells)],
    ['Buildings', String(brief.footprint.buildings)],
    ['High hazard', String(brief.footprint.highHazard)],
    ['People (proxy)', brief.footprint.people.toLocaleString('en-US')],
  ];
  chips.forEach((chip, index) => {
    const x = 40 + index * 129;
    pdf.fillRect(x, y, 121, 44, CARD);
    pdf.text(chip[0], x + 8, y + 8, { size: 7, bold: true, color: GOLD });
    pdf.text(chip[1], x + 8, y + 22, { size: 12, bold: true, color: INK, maxWidth: 105 });
  });
  y += 56;
  pdf.text('These are planning counts, not people protected.', 40, y, { size: 8, color: MUTED });
  y += 16;
  pdf.text(communityStatusLabel(brief.communityStatus), 40, y, { size: 11, bold: true, color: INK });
  y += 16;
  y += pdf.text(brief.community, 40, y, { size: 10, color: INK, maxWidth: 515 });
  y += 8;
  pdf.text('What would change the recommendation', 40, y, { size: 10, bold: true, color: GOLD });
  y += 14;
  (brief.changeTriggers ?? []).forEach((item) => {
    y += pdf.text(`- ${item}`, 40, y, { size: 9, color: INK, maxWidth: 515 });
    y += 4;
  });
  y += 8;
  pdf.text(EARLY_ACTION.title, 40, y, { size: 12, bold: true, color: INK });
  y += 18;
  drawMechanism(pdf, 40, y, 515, 132);
  y += 140;
  pdf.text(EARLY_ACTION.legend, 40, y, { size: 8, color: MUTED, maxWidth: 515 });
}

function pageDecision(pdf, brief) {
  startPage(pdf, brief, 6);
  let y = 84;
  pdf.text('Decision and sources', 40, y, { size: 16, bold: true, color: INK });
  y += 20;
  pdf.fillRect(40, y, 515, pdf.measure(brief.decision, { size: 11, maxWidth: 490 }) + 20, DARK);
  pdf.text(brief.decision, 52, y + 10, { size: 11, color: WHITE, maxWidth: 490 });
  y += pdf.measure(brief.decision, { size: 11, maxWidth: 490 }) + 36;
  pdf.text('Sources', 40, y, { size: 12, bold: true, color: INK });
  y += 16;
  const sources = [];
  const seen = new Set();
  for (const source of brief.costing?.sources ?? []) {
    const key = source.url || source.id;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    sources.push(source);
  }
  sources.slice(0, 10).forEach((source) => {
    const line = `${source.id}  ·  ${source.source_date ?? ''}  ·  ${source.url}`;
    const height = pdf.measure(line, { size: 8, maxWidth: 515 });
    pdf.text(line, 40, y, { size: 8, color: INK, maxWidth: 515 });
    if (source.url) pdf.addLink(40, y, 515, height, source.url);
    y += height + 4;
  });
  y += 8;
  if (brief.technicalNote) {
    pdf.text(brief.technicalNote, 40, y, { size: 8, color: MUTED, maxWidth: 515 });
    y += 14;
  }
  pdf.text(
    'Ourea is decision intelligence for adaptation portfolios under uncertainty. It does not predict landslides, structural failure, people saved or losses avoided.',
    40,
    y,
    { size: 8, color: MUTED, maxWidth: 515 },
  );
}

export function buildDecisionBriefPdf(brief) {
  const pdf = createPdf({
    info: {
      title: `Ourea decision brief — ${brief.subtitle}`,
      author: 'Ourea',
      subject: `Pre-feasibility adaptation decision brief for ${brief.subtitle}`,
      keywords: ['Ourea', 'Innovate4Cities', 'Llanaditas', 'Medellín', 'adaptation', 'decision brief'],
      creationDate: brief.generatedAt,
      lang: 'en-US',
    },
  });
  pageExecutive(pdf, brief);
  pdf.addPage();
  pageWhere(pdf, brief);
  pdf.addPage();
  pageCost(pdf, brief);
  pdf.addPage();
  pagePathway(pdf, brief);
  pdf.addPage();
  pageRobustness(pdf, brief);
  pdf.addPage();
  pageDecision(pdf, brief);
  return pdf.toBlob();
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
