import { createPdf, jpegFromDataUrl, jpegSofSize } from './pdfDocument.js';
import { assetUrl } from '../config/assetUrl.js';
import { cellSimulatorUrl } from './sessionLink.js';
import { drawHillsideScene, STORYBOARD } from './hillsideWarning.js';

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

function formatDate(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function renderBriefFigure(brief) {
  if (typeof document === 'undefined') return null;
  const width = 1400;
  const height = 720;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#111517';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#d9bd75';
  ctx.font = '600 22px Inter, system-ui, sans-serif';
  ctx.fillText('WHERE TO ACT', 48, 58);
  ctx.fillStyle = '#eee8dc';
  ctx.font = '600 36px Inter, system-ui, sans-serif';
  ctx.fillText(brief.subtitle, 48, 108);
  ctx.fillStyle = '#8c999d';
  ctx.font = '18px Inter, system-ui, sans-serif';
  ctx.fillText(`${brief.city}  ·  ${brief.rainfall}`, 48, 142);

  const groups = brief.groups.length ? brief.groups : [{ type: 'none', label: 'No projects yet', projects: [], verb: '' }];
  const gap = 24;
  const cardW = (width - 96 - gap * (groups.length - 1)) / groups.length;
  groups.forEach((group, index) => {
    const x = 48 + index * (cardW + gap);
    const y = 188;
    ctx.fillStyle = '#1c2428';
    roundRect(ctx, x, y, cardW, 484, 18);
    ctx.fill();
    ctx.fillStyle = `rgb(${(TYPE_COLORS[group.type] ?? GOLD).join(',')})`;
    ctx.fillRect(x, y, 8, 484);
    ctx.fillStyle = '#d9bd75';
    ctx.font = '600 16px Inter, system-ui, sans-serif';
    ctx.fillText(group.label.toUpperCase(), x + 28, y + 42);
    ctx.fillStyle = '#eee8dc';
    ctx.font = '700 64px Inter, system-ui, sans-serif';
    ctx.fillText(String(group.projects.length), x + 28, y + 118);
    ctx.fillStyle = '#8c999d';
    ctx.font = '18px Inter, system-ui, sans-serif';
    ctx.fillText(group.projects.length === 1 ? 'site' : 'sites', x + 28, y + 148);
    ctx.fillStyle = '#d8d3c8';
    ctx.font = '16px Inter, system-ui, sans-serif';
    const lines = wrapCanvas(ctx, group.verb, cardW - 56);
    lines.forEach((line, lineIndex) => ctx.fillText(line, x + 28, y + 196 + lineIndex * 24));
    group.projects.slice(0, 8).forEach((project, projectIndex) => {
      ctx.fillStyle = '#242d32';
      roundRect(ctx, x + 28, y + 268 + projectIndex * 24, 120, 20, 6);
      ctx.fill();
      ctx.fillStyle = '#eee8dc';
      ctx.font = '14px Inter, system-ui, sans-serif';
      ctx.fillText(`Cell ${project.cell_id}`, x + 40, y + 283 + projectIndex * 24);
    });
  });

  const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
  const bytes = jpegFromDataUrl(dataUrl);
  if (!bytes) return null;
  return { bytes, width, height };
}

function wrapCanvas(ctx, text, maxWidth) {
  const words = String(text ?? '').split(/\s+/).filter(Boolean);
  const lines = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (current && ctx.measureText(next).width > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, 4);
}

function projectSite(lng, lat, frame, bbox) {
  const [west, south, east, north] = bbox;
  const u = (lng - west) / (east - west);
  const v = (north - lat) / (north - south);
  const skew = (1 - u) * frame.skew;
  return [
    frame.x + 18 + u * (frame.w - 36),
    frame.y + 18 + v * (frame.h - 36) * 0.86 + skew,
  ];
}

function cellPath(ctx, site, frame, bbox) {
  if (!site.ring?.length) return false;
  ctx.beginPath();
  site.ring.forEach((point, index) => {
    const [x, y] = projectSite(point[0], point[1], frame, bbox);
    if (index === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.closePath();
  return true;
}

function cellCentroid(site, frame, bbox) {
  const xs = [];
  const ys = [];
  site.ring.forEach((point) => {
    const [x, y] = projectSite(point[0], point[1], frame, bbox);
    xs.push(x);
    ys.push(y);
  });
  return [(Math.min(...xs) + Math.max(...xs)) / 2, (Math.min(...ys) + Math.max(...ys)) / 2];
}

const ACTION_FILL = {
  rwh: { fill: '#5d91a7', glow: 'rgba(93, 145, 167, 0.5)', label: 'RWH' },
  drainage: { fill: '#c8a75e', glow: 'rgba(200, 167, 94, 0.5)', label: 'Drain' },
  restoration: { fill: '#6c9878', glow: 'rgba(108, 152, 120, 0.5)', label: 'Restore' },
};

const ACTION_LEGEND = [
  { type: 'rwh', color: '#5d91a7', label: 'Rainwater harvesting' },
  { type: 'drainage', color: '#c8a75e', label: 'Drainage' },
  { type: 'restoration', color: '#6c9878', label: 'Restoration' },
];

const TOC_SECTIONS = [
  'The decision',
  'How to implement this',
  'People required',
  'Site work orders',
  'Where the budget would go',
  'Why this holds up',
  'Community and safeguards',
  'Read this carefully',
];

const IMAGERY_BBOX = [-75.5426, 6.2489, -75.5351, 6.2564];

function loadImage(url) {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null);
      return;
    }
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export async function renderSitePlate(brief) {
  if (typeof document === 'undefined') return null;
  const sites = brief.sites ?? [];
  if (!sites.length) return null;
  const width = 1600;
  const height = 1100;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const bbox = IMAGERY_BBOX;
  const aerial = await loadImage(assetUrl('data/llanaditas_imagery.jpg'));
  const frame = { x: 0, y: 0, w: width, h: height, skew: 0 };
  const presentTypes = new Set(sites.filter((site) => site.type).map((site) => site.type));

  if (aerial) {
    ctx.drawImage(aerial, 0, 0, width, height);
  } else {
    const sky = ctx.createLinearGradient(0, 0, width, height);
    sky.addColorStop(0, '#2a3438');
    sky.addColorStop(1, '#12181b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
  }

  const idle = sites.filter((site) => !site.type);
  const active = sites.filter((site) => site.type);
  idle.forEach((site) => {
    if (!cellPath(ctx, site, frame, bbox)) return;
    ctx.fillStyle = 'rgba(15, 21, 24, 0.08)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
  active.forEach((site) => {
    if (!cellPath(ctx, site, frame, bbox)) return;
    const paint = ACTION_FILL[site.type] ?? ACTION_FILL.rwh;
    ctx.fillStyle = paint.fill;
    ctx.globalAlpha = 0.42;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#f6f1e6';
    ctx.lineWidth = 2.4;
    ctx.stroke();
  });
  active.forEach((site) => {
    const [cx, cy] = cellCentroid(site, frame, bbox);
    ctx.font = '700 18px Inter, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(15, 21, 24, 0.85)';
    ctx.strokeText(`Cell ${site.id}`, cx, cy + 4);
    ctx.fillStyle = '#f6f1e6';
    ctx.fillText(`Cell ${site.id}`, cx, cy + 4);
    ctx.textAlign = 'start';
  });

  ctx.fillStyle = 'rgba(17, 21, 23, 0.78)';
  ctx.fillRect(0, 0, width, 54);
  ctx.fillStyle = '#d9bd75';
  ctx.font = '700 16px Inter, system-ui, sans-serif';
  ctx.fillText('Llanaditas / Upper Comuna 8, Medellín', 24, 34);
  ctx.fillStyle = '#d8d3c8';
  ctx.font = '13px Inter, system-ui, sans-serif';
  ctx.fillText('Satellite view with recommended planning cells', 520, 34);

  const legend = ACTION_LEGEND.filter((item) => presentTypes.has(item.type));
  ctx.fillStyle = 'rgba(17, 21, 23, 0.78)';
  ctx.fillRect(0, height - 52, width, 52);
  legend.forEach((item, index) => {
    const x = 28 + index * 220;
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(x, height - 26, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#eee8dc';
    ctx.font = '14px Inter, system-ui, sans-serif';
    ctx.fillText(item.label, x + 16, height - 21);
  });
  ctx.fillStyle = '#8c999d';
  ctx.font = '12px Inter, system-ui, sans-serif';
  ctx.fillText('Esri World Imagery (Maxar)', width - 248, height - 21);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  const bytes = jpegFromDataUrl(dataUrl);
  if (!bytes) return null;
  const size = jpegSofSize(bytes);
  return { bytes, width: size?.width ?? width, height: size?.height ?? height };
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

const ICONS = {
  pin: [
    ['M', 7, 1], ['C', 3.6, 1, 2, 3.4, 2, 6.2], ['C', 2, 9.8, 7, 14, 7, 14],
    ['C', 7, 14, 12, 9.8, 12, 6.2], ['C', 12, 3.4, 10.4, 1, 7, 1],
  ],
  home: [
    ['M', 2, 12], ['L', 2, 6], ['L', 7, 2], ['L', 12, 6], ['L', 12, 12],
    ['M', 5.5, 12], ['L', 5.5, 8], ['L', 8.5, 8], ['L', 8.5, 12],
  ],
  people: [
    ['M', 5, 2.4], ['C', 6.6, 2.4, 7.6, 3.6, 7.6, 5], ['C', 7.6, 6.4, 6.6, 7.6, 5, 7.6],
    ['C', 3.4, 7.6, 2.4, 6.4, 2.4, 5], ['C', 2.4, 3.6, 3.4, 2.4, 5, 2.4],
    ['M', 1.8, 13], ['C', 1.8, 10.4, 3.2, 9, 5, 9], ['C', 6.8, 9, 8.2, 10.4, 8.2, 13],
    ['M', 10.2, 4], ['C', 11.4, 4, 12.2, 4.9, 12.2, 6], ['C', 12.2, 7.1, 11.4, 8, 10.2, 8],
    ['C', 9, 8, 8.2, 7.1, 8.2, 6], ['C', 8.2, 4.9, 9, 4, 10.2, 4],
  ],
  clock: [
    ['M', 7, 1.6], ['C', 10.2, 1.6, 12.4, 3.8, 12.4, 7], ['C', 12.4, 10.2, 10.2, 12.4, 7, 12.4],
    ['C', 3.8, 12.4, 1.6, 10.2, 1.6, 7], ['C', 1.6, 3.8, 3.8, 1.6, 7, 1.6],
    ['M', 7, 4], ['L', 7, 7.2], ['L', 9.4, 8.6],
  ],
  check: [
    ['M', 2.4, 7.4], ['L', 5.6, 10.6], ['L', 12, 3.6],
  ],
  drop: [
    ['M', 7, 1.6], ['C', 7, 1.6, 2.2, 7.2, 2.2, 10], ['C', 2.2, 12.6, 4.2, 14, 7, 14],
    ['C', 9.8, 14, 11.8, 12.6, 11.8, 10], ['C', 11.8, 7.2, 7, 1.6, 7, 1.6],
  ],
  warn: [
    ['M', 7, 1.8], ['L', 13, 12.4], ['L', 1, 12.4], ['L', 7, 1.8],
    ['M', 7, 5.6], ['L', 7, 8.8],
  ],
  shield: [
    ['M', 7, 1.6], ['L', 12.4, 3.6], ['L', 12.4, 8], ['C', 12.4, 11, 10, 12.8, 7, 13.6],
    ['C', 4, 12.8, 1.6, 11, 1.6, 8], ['L', 1.6, 3.6], ['L', 7, 1.6],
  ],
};

function drawIcon(pdf, x, y, name, color = DARK) {
  const commands = ICONS[name];
  if (!commands) return;
  pdf.strokeCommands(scaleCmd(x, y, 1, commands), { color, lineWidth: 1.15 });
}

function iconBadge(pdf, x, y, name) {
  pdf.fillRect(x, y, 16, 16, GOLD);
  drawIcon(pdf, x + 1, y + 1, name, DARK);
}

function creditLabel(credits) {
  const n = Number(credits) || 0;
  return n === 1 ? '1 credit' : `${n} credits`;
}

function communityStatusLabel(status) {
  if (status === 'community_reviewed') return 'Community review recorded';
  if (status === 'requires_deliberation') return 'Needs deliberation';
  if (status === 'incomplete') return 'Incomplete review';
  return 'Not assessed';
}

export function renderNoActionFigure(brief) {
  if (typeof document === 'undefined') return null;
  const width = 1400;
  const height = 820;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const houseCount = (brief.buildings ?? []).filter((house) => house.hazard === 'Alta' || house.stress >= 0.75).length
    || 8;

  ctx.fillStyle = '#111517';
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = '#d9bd75';
  ctx.font = '700 20px Inter, system-ui, sans-serif';
  ctx.fillText('If nothing is done: rain, then houses fall', 24, 34);
  ctx.fillStyle = '#d8d3c8';
  ctx.font = '13px Inter, system-ui, sans-serif';
  ctx.fillText(
    `A looping warning for about ${houseCount} high-stress houses in the recommended cells. Read left to right, like a GIF. Not a collapse year.`,
    24,
    56,
  );

  const gap = 16;
  const frameW = (width - 48 - gap * 3) / 4;
  const frameH = 620;
  const top = 78;
  STORYBOARD.forEach((frame, index) => {
    const x = 24 + index * (frameW + gap);
    ctx.fillStyle = '#1c2428';
    ctx.fillRect(x - 4, top - 4, frameW + 8, frameH + 8);
    drawHillsideScene(ctx, {
      x,
      y: top,
      width: frameW,
      height: frameH,
      t: frame.t,
      treat: frame.treat,
      title: frame.title,
    });
  });

  ctx.fillStyle = '#1c2428';
  ctx.fillRect(0, height - 88, width, 88);
  ctx.fillStyle = '#d9bd75';
  ctx.font = '700 14px Inter, system-ui, sans-serif';
  ctx.fillText('How to read this', 24, height - 58);
  ctx.fillStyle = '#d8d3c8';
  ctx.font = '13px Inter, system-ui, sans-serif';
  ctx.fillText('Frames 1-3: no works. Rain hits the slope, houses lean, then fall. Frame 4: drainage, tanks and plants; the same houses stand.', 24, height - 36);
  ctx.fillText('Construction: weeks to months after design. First wet season: drainage and tanks. Year 3: restoration matures. Collapse year: not predicted.', 24, height - 14);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
  const bytes = jpegFromDataUrl(dataUrl);
  if (!bytes) return null;
  return { bytes, width, height };
}

export function renderSearchFigure(brief) {
  return renderNoActionFigure(brief);
}

function drawLogo(pdf, x, y, scale = 0.72) {
  pdf.strokeCommands(scaleCmd(x, y, scale, [
    ['M', 8, 42], ['L', 24, 16], ['L', 32, 30], ['L', 42, 12], ['L', 56, 42],
  ]), { color: [238, 232, 220], lineWidth: 1.55 });
  pdf.strokeCommands(scaleCmd(x, y, scale, [
    ['M', 10, 46], ['C', 20, 42, 28, 50, 38, 44], ['C', 46, 40, 52, 46, 54, 44],
  ]), { color: GOLD, lineWidth: 1.15 });
  pdf.strokeCommands(scaleCmd(x, y, scale, [
    ['M', 12, 51], ['C', 22, 47, 30, 54, 39, 49], ['C', 47, 45, 52, 51, 54, 49],
  ]), { color: GOLD, lineWidth: 1 });
  pdf.strokeCommands(scaleCmd(x, y, scale, [
    ['M', 14, 56], ['C', 24, 52, 31, 58, 40, 54], ['C', 47, 51, 52, 55, 54, 54],
  ]), { color: GOLD, lineWidth: 0.85 });
}

function header(pdf, brief) {
  pdf.fillRect(0, 0, pdf.width, 78, DARK);
  pdf.fillRect(0, 78, pdf.width, 4, GOLD);
  drawLogo(pdf, 24, 12, 0.62);
  pdf.text('OUREA', 72, 18, { size: 9, bold: true, color: GOLD });
  pdf.text('Implementation proposal', 72, 36, { size: 16, bold: true, color: WHITE });
  pdf.text(brief.subtitle, 72, 56, { size: 9, color: [217, 189, 117] });
  pdf.text(formatDate(brief.generatedAt), pdf.width - 168, 36, { size: 9, color: [140, 153, 157] });
}

function footer(pdf, brief, page, totalPages) {
  pdf.fillRect(0, pdf.height - 36, pdf.width, 36, DARK);
  pdf.text('From climate risk to robust action.', 40, pdf.height - 22, { size: 9, color: GOLD });
  pdf.text(`Page ${page} of ${totalPages}`, pdf.width - 98, pdf.height - 22, { size: 9, color: [140, 153, 157] });
  if (brief.reproducibleId) {
    pdf.text(brief.reproducibleId, 248, pdf.height - 22, { size: 8, color: [140, 153, 157] });
  }
}

function drawCover(pdf, brief, totalPages) {
  pdf.fillRect(0, 0, pdf.width, pdf.height, DARK);
  pdf.fillRect(0, 0, 10, pdf.height, GOLD);
  drawLogo(pdf, 48, 88, 1.55);
  pdf.text('OUREA', 48, 188, { size: 12, bold: true, color: GOLD });
  pdf.text('Implementation proposal', 48, 228, { size: 28, bold: true, color: WHITE, maxWidth: 500 });
  pdf.text(brief.subtitle, 48, 280, { size: 14, color: [217, 189, 117], maxWidth: 500 });
  pdf.text(`${brief.city}  ·  ${formatDate(brief.generatedAt)}`, 48, 308, { size: 12, color: [140, 153, 157] });
  pdf.fillRect(48, 340, 72, 3, GOLD);
  pdf.text(brief.recommendation, 48, 368, { size: 12, color: WHITE, maxWidth: 480 });
  pdf.text('A working brief for municipal staff, community leaders and the design team.', 48, 430, {
    size: 11,
    color: [200, 190, 170],
    maxWidth: 480,
  });
  pdf.text('Innovate4Cities 2026', 48, pdf.height - 88, { size: 10, color: GOLD });
  pdf.text('From climate risk to robust action.', 48, pdf.height - 68, { size: 10, color: [217, 189, 117] });
  pdf.text(`Page 1 of ${totalPages}`, pdf.width - 98, pdf.height - 22, { size: 9, color: [140, 153, 157] });
  if (brief.reproducibleId) {
    pdf.text(brief.reproducibleId, 48, pdf.height - 22, { size: 8, color: [140, 153, 157] });
  }
}

function briefPlan(brief) {
  return (brief.projects ?? []).map((item) => ({ cell_id: item.cell_id, type: item.type }));
}

function projectLink(brief, cellId) {
  if (!brief.simulatorUrl) return null;
  return cellSimulatorUrl(cellId, brief.simulatorUrl, briefPlan(brief));
}

function layoutBrief(brief, totalPages, sectionPages = {}) {
  const pdf = createPdf();
  const networkImage = brief.networkImage;
  const bottom = 52;
  let page = 1;
  let y = 0;
  const recorded = {};

  function startPage() {
    pdf.fillRect(0, 0, pdf.width, pdf.height, CREAM);
    header(pdf, brief);
    y = 98;
  }

  function closePage() {
    footer(pdf, brief, page, totalPages || page);
  }

  function ensure(need) {
    if (y + need <= pdf.height - bottom) return;
    closePage();
    page += 1;
    pdf.addPage();
    startPage();
  }

  function heading(title) {
    recorded[title] = page;
    ensure(28);
    y += pdf.text(title, 40, y, { size: 14, bold: true, color: INK });
    y += 6;
  }

  function paragraph(text, { size = 11, color = INK, maxWidth = 515, gap = 8, bold = false } = {}) {
    const height = pdf.measure(text, { size, maxWidth });
    ensure(height + 4);
    y += pdf.text(text, 40, y, { size, color, maxWidth, bold });
    y += gap;
  }

  function picture(label, image, maxHeight = 268) {
    if (!image?.bytes) return;
    const size = jpegSofSize(image.bytes) ?? { width: image.width, height: image.height };
    if (!size?.width || !size.height) return;
    const displayWidth = 515;
    const displayHeight = Math.min(maxHeight, displayWidth * (size.height / size.width));
    ensure(displayHeight + 28);
    y += pdf.text(label, 40, y, { size: 9, bold: true, color: GOLD });
    y += 8;
    pdf.addJpeg({
      bytes: image.bytes,
      width: size.width,
      height: size.height,
      x: 40,
      y,
      displayWidth,
      displayHeight,
    });
    y += displayHeight + 12;
  }

  function drawWorkOrder(project) {
    const accent = TYPE_COLORS[project.type] ?? GOLD;
    const place = project.place ? `This cell is ${project.place}.` : 'Location is taken from the Llanaditas planning grid.';
    const first = project.firstTask ?? '';
    const how = project.how ?? '';
    const inner = 455;
    const placeH = pdf.measure(place, { size: 10, maxWidth: inner });
    const crewH = pdf.measure(project.crew, { size: 10, maxWidth: inner });
    const timeH = pdf.measure(project.duration, { size: 10, maxWidth: inner });
    const firstH = pdf.measure(first, { size: 10, maxWidth: inner });
    const howH = pdf.measure(how, { size: 10, maxWidth: inner });
    const link = projectLink(brief, project.cell_id);
    const height = 226 + placeH + crewH + timeH + firstH + howH;
    ensure(height + 8);

    const top = y;
    pdf.fillRect(40, top, 515, height, CARD);
    pdf.fillRect(40, top, 6, height, accent);
    pdf.fillCircle(58, top + 18, 5, accent);
    pdf.text(`Cell ${project.cell_id}`, 70, top + 8, { size: 13, bold: true, color: INK });
    pdf.text(project.label, 70, top + 26, { size: 10, color: MUTED });
    pdf.text(creditLabel(project.credits), 430, top + 12, { size: 10, bold: true, color: GOLD });
    if (link) pdf.addLink(40, top, 515, 44, link);
    y = top + 48;

    iconBadge(pdf, 52, y, 'pin');
    pdf.text('On the hillside', 74, y, { size: 8, bold: true, color: GOLD });
    y += 14;
    y += pdf.text(place, 74, y, { size: 10, color: INK, maxWidth: inner });
    y += 8;

    const chips = [
      [String(project.buildings), 'buildings'],
      [String(project.households), 'households'],
      [String(project.people), 'people'],
      [`${Number(project.slope || 0).toFixed(0)}°`, 'slope'],
    ];
    chips.forEach((chip, index) => {
      const x = 52 + index * 122;
      pdf.fillRect(x, y, 114, 36, CREAM);
      pdf.text(chip[0], x + 8, y + 6, { size: 11, bold: true, color: INK });
      pdf.text(chip[1], x + 8, y + 20, { size: 7, color: MUTED });
    });
    y += 46;

    iconBadge(pdf, 52, y, 'people');
    pdf.text('Crew', 74, y, { size: 8, bold: true, color: GOLD });
    y += 14;
    y += pdf.text(project.crew, 74, y, { size: 10, color: INK, maxWidth: inner });
    y += 8;

    iconBadge(pdf, 52, y, 'clock');
    pdf.text('Time', 74, y, { size: 8, bold: true, color: GOLD });
    y += 14;
    y += pdf.text(project.duration, 74, y, { size: 10, color: INK, maxWidth: inner });
    y += 8;

    iconBadge(pdf, 52, y, 'check');
    pdf.text('First walk', 74, y, { size: 8, bold: true, color: GOLD });
    y += 14;
    y += pdf.text(first, 74, y, { size: 10, color: INK, maxWidth: inner });
    y += 8;

    iconBadge(pdf, 52, y, 'home');
    pdf.text('How to do it', 74, y, { size: 8, bold: true, color: GOLD });
    y += 14;
    y += pdf.text(how, 74, y, { size: 10, color: INK, maxWidth: inner });
    y += 8;
    const items = [
      link ? ['Ourea map', link] : null,
      project.mapsUrl ? ['Google Maps', project.mapsUrl] : null,
      project.earthUrl ? ['Google Earth', project.earthUrl] : null,
    ].filter(Boolean);
    items.forEach((item, index) => {
      const x = 74 + index * 148;
      pdf.text(item[0], x, y, { size: 9, bold: true, color: GOLD });
      pdf.addLink(x - 4, y - 2, 140, 14, item[1]);
    });
    y = top + height + 10;
  }

  drawCover(pdf, brief, totalPages || 1);

  pdf.addPage();
  page = 2;
  startPage();
  y += pdf.text('Contents', 40, y, { size: 18, bold: true, color: INK });
  y += 8;
  paragraph('Click a section to open that page.', { size: 10, color: MUTED, gap: 14 });
  TOC_SECTIONS.forEach((title, index) => {
    const destPage = sectionPages[title] ?? 3 + index;
    const number = String(destPage).padStart(2, '0');
    pdf.addLink(40, y, pdf.width - 80, 20, destPage);
    pdf.text(title, 40, y, { size: 12, color: INK, maxWidth: 420 });
    pdf.text(number, pdf.width - 62, y, { size: 12, color: GOLD });
    pdf.fillRect(40, y + 16, pdf.width - 102, 0.6, CARD);
    y += 24;
  });
  closePage();

  pdf.addPage();
  page = 3;
  startPage();
  heading('The decision');
  paragraph(brief.recommendation, { size: 13, bold: true, gap: 10 });

  ensure(60);
  const stats = [
    ['Priority', brief.priority],
    ['Budget', `${brief.budgetSpent} of ${brief.budgetAvailable} credits`],
    ['People (proxy)', `${brief.footprint.people.toLocaleString('en-US')} in targeted cells`],
  ];
  stats.forEach((stat, index) => {
    const x = 40 + index * 172;
    pdf.fillRect(x, y, 164, 52, CARD);
    pdf.text(stat[0], x + 10, y + 10, { size: 8, bold: true, color: GOLD });
    pdf.text(stat[1], x + 10, y + 26, { size: 10, color: INK, maxWidth: 144 });
  });
  y += 68;

  picture('Satellite view of Llanaditas with recommended planning cells', brief.siteImage, 292);

  if (brief.projects.length) {
    paragraph('Each numbered square is an 80 m planning cell on the hillside. Click a cell name to open it in Ourea, or use Google Maps / Earth to see the same square.', { gap: 8 });
    brief.projects.forEach((project) => {
      const line = `Cell ${project.cell_id}  ·  ${project.label}`;
      const placeH = pdf.measure(project.place ?? '', { size: 9, maxWidth: 455 });
      ensure(44 + placeH);
      const link = projectLink(brief, project.cell_id);
      pdf.fillCircle(48, y + 8, 4, TYPE_COLORS[project.type] ?? GOLD);
      pdf.text(line, 60, y, { size: 11, bold: true, color: INK });
      if (link) pdf.addLink(40, y, 515, 16, link);
      y += 14;
      if (project.place) {
        y += pdf.text(project.place, 60, y, { size: 9, color: MUTED, maxWidth: 455 });
      }
      const items = [
        link ? ['Ourea map', link] : null,
        project.mapsUrl ? ['Google Maps', project.mapsUrl] : null,
        project.earthUrl ? ['Google Earth', project.earthUrl] : null,
      ].filter(Boolean);
      items.forEach((item, index) => {
        const x = 60 + index * 148;
        pdf.text(item[0], x, y, { size: 9, bold: true, color: GOLD });
        pdf.addLink(x - 4, y - 2, 140, 14, item[1]);
      });
      y += 18;
    });
  }

  heading('How to implement this');
  paragraph(
    'Do the work in the order below. Crew sizes are planning estimates for discussion, not a contract.',
    { gap: 10 },
  );
  (brief.phases ?? []).forEach((phase, index) => {
    const titleHeight = pdf.measure(phase.title, { size: 11, maxWidth: 455 });
    const bodyHeight = pdf.measure(phase.body, { size: 10, maxWidth: 455 });
    const timeH = pdf.measure(phase.duration, { size: 9, maxWidth: 430 });
    const peopleH = pdf.measure(phase.people, { size: 9, maxWidth: 430 });
    ensure(titleHeight + bodyHeight + timeH + peopleH + 48);
    pdf.fillRect(40, y, 18, 18, GOLD);
    pdf.text(String(index + 1), 45, y + 3, { size: 10, bold: true, color: DARK });
    y += pdf.text(phase.title, 66, y + 2, { size: 11, bold: true, color: INK, maxWidth: 455 });
    y += 6;
    iconBadge(pdf, 66, y, 'clock');
    y += pdf.text(phase.duration, 88, y + 2, { size: 9, color: MUTED, maxWidth: 430 });
    y += 4;
    iconBadge(pdf, 66, y, 'people');
    y += pdf.text(phase.people, 88, y + 2, { size: 9, color: MUTED, maxWidth: 430 });
    y += 8;
    y += pdf.text(phase.body, 66, y, { size: 10, color: INK, maxWidth: 455 });
    y += 12;
  });
  y += 4;

  heading('People required');
  paragraph(brief.team?.kickoff ?? 'Convene a first meeting before any works.', { gap: 10 });
  paragraph(brief.team?.peakOnSite ?? '', { gap: 10 });
  (brief.team?.core ?? []).forEach((role) => {
    const height = Math.max(20, pdf.measure(role, { size: 10, maxWidth: 475 }));
    ensure(height + 10);
    iconBadge(pdf, 40, y, 'people');
    y += pdf.text(role, 64, y + 1, { size: 10, color: INK, maxWidth: 475 });
    y += 8;
  });
  if (brief.team?.note) paragraph(brief.team.note, { size: 9, color: MUTED, gap: 12 });

  heading('Site work orders');
  if (!brief.projects.length) {
    paragraph('No interventions are in the active portfolio.', { color: MUTED, gap: 16 });
  } else {
    paragraph('Each card is one recommended work. Read where it sits, who is needed, then the first walk.', {
      size: 10,
      color: MUTED,
      gap: 10,
    });
    brief.projects.forEach((project) => drawWorkOrder(project));
  }

  heading('Where the budget would go');
  const costing = brief.costing;
  paragraph(costing?.copNote ?? 'Planning credits are not Colombian pesos.', { gap: 10 });
  if (costing?.rows?.length) {
    costing.rows.forEach((row) => {
      const barWidth = Math.max(8, Math.round(360 * (row.share || 0)));
      const buyH = pdf.measure(row.buy, { size: 10, maxWidth: 455 });
      ensure(58 + buyH);
      pdf.fillRect(40, y, 515, 50 + buyH, CARD);
      pdf.fillRect(40, y, 6, 50 + buyH, TYPE_COLORS[row.type] ?? GOLD);
      pdf.text(row.label, 56, y + 8, { size: 11, bold: true, color: INK });
      pdf.text(`${row.count} sites  ·  ${row.credits} credits  ·  ~${row.personWeeks} person-weeks`, 56, y + 24, {
        size: 9,
        color: MUTED,
        maxWidth: 480,
      });
      pdf.fillRect(56, y + 40, 360, 6, CREAM);
      pdf.fillRect(56, y + 40, barWidth, 6, TYPE_COLORS[row.type] ?? GOLD);
      pdf.text(row.buy, 56, y + 52, { size: 10, color: INK, maxWidth: 455 });
      y += 62 + buyH;
    });
    paragraph(`About ${costing.personWeeks} person-weeks of field effort if crews run in sequence. Price that mix in COP after design.`, {
      size: 10,
      color: MUTED,
      gap: 10,
    });
  }
  (costing?.when ?? []).forEach((item) => {
    const bodyH = pdf.measure(item.body, { size: 10, maxWidth: 455 });
    ensure(bodyH + 28);
    iconBadge(pdf, 40, y, 'clock');
    pdf.text(item.label, 64, y, { size: 10, bold: true, color: INK });
    y += 14;
    y += pdf.text(item.body, 64, y, { size: 10, color: INK, maxWidth: 455 });
    y += 8;
  });
  if (costing?.ifNothing) paragraph(costing.ifNothing, { size: 10, color: MUTED, gap: 12 });

  heading('Why this holds up');
  paragraph(brief.robustness, { gap: 10 });
  ensure(70);
  const footprintChips = [
    ['Cells', String(brief.footprint.cells)],
    ['Buildings', String(brief.footprint.buildings)],
    ['High hazard', String(brief.footprint.highHazard)],
    ['People (proxy)', brief.footprint.people.toLocaleString('en-US')],
  ];
  footprintChips.forEach((chip, index) => {
    const x = 40 + index * 129;
    pdf.fillRect(x, y, 121, 48, CARD);
    pdf.text(chip[0], x + 8, y + 8, { size: 7, bold: true, color: GOLD });
    pdf.text(chip[1], x + 8, y + 24, { size: 12, bold: true, color: INK, maxWidth: 105 });
  });
  y += 56;
  paragraph('These are planning counts, not people protected.', { size: 9, color: MUTED, gap: 12 });

  heading('Community and safeguards');
  ensure(28);
  iconBadge(pdf, 40, y, 'shield');
  pdf.text(communityStatusLabel(brief.communityStatus), 64, y + 2, { size: 11, bold: true, color: INK });
  y += 22;
  paragraph(brief.community, { gap: 12 });

  picture('If nothing is done: rain, then houses fall (read left to right)', networkImage, 280);
  paragraph(
    'A PDF cannot play a looping GIF, so this is the same sequence as stills: rain, houses lean, houses fall, then the works. Ourea does not predict houses collapsing or a collapse year. Watch the loop in the simulator.',
    { size: 9, color: MUTED, gap: 12 },
  );

  heading('Read this carefully');
  brief.caveats.forEach((caveat) => {
    const height = Math.max(22, pdf.measure(caveat, { size: 10, maxWidth: 471 }));
    ensure(height + 14);
    pdf.fillRect(40, y, 515, height + 10, CARD);
    iconBadge(pdf, 48, y + 4, 'warn');
    pdf.text(caveat, 72, y + 5, { size: 10, color: INK, maxWidth: 471 });
    y += height + 16;
  });
  if (brief.technicalNote) {
    y += 8;
    paragraph(brief.technicalNote, { size: 8, color: MUTED, gap: 0 });
  }

  closePage();
  return { pdf, recorded, pageCount: pdf.pageCount() };
}

export function buildDecisionBriefPdf(brief) {
  const first = layoutBrief(brief, 0, {});
  return layoutBrief(brief, first.pageCount, first.recorded).pdf.toBlob();
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}
