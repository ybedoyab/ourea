import { RWH_ASSUMPTIONS } from '../config/modelConfig.js';

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

const TYPE_LABEL = {
  rwh: 'Rainwater harvesting',
  drainage: 'Drainage upgrade',
  restoration: 'Restoration / bioengineering',
};

export function formatUsd(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  return USD.format(Number(value)).replace('$', 'US$');
}

export function roundUsd(value, step = 1000) {
  if (value == null || !Number.isFinite(Number(value))) return null;
  const size = Number(step) || 1000;
  return Math.round(Number(value) / size) * size;
}

export function formatUsdMillions(value) {
  const rounded = roundUsd(value);
  if (rounded == null) return '—';
  const millions = rounded / 1e6;
  const digits = millions >= 10 ? 1 : 2;
  return `US$${millions.toFixed(digits)} million`;
}

export function formatUsdMillionRange(low, high) {
  const lo = roundUsd(low);
  const hi = roundUsd(high);
  if (lo == null || hi == null) return '—';
  return `US$${(lo / 1e6).toFixed(2)}–${(hi / 1e6).toFixed(2)} million`;
}

export function rwhParticipatingSystems(buildings, share = RWH_ASSUMPTIONS.participationShare) {
  const count = Number(buildings) || 0;
  const participation = Number(share);
  if (!Number.isFinite(participation) || participation <= 0) return 0;
  return Math.max(1, Math.round(count * participation));
}

function band(low, base, high) {
  return { low, base, high };
}

function addBands(items) {
  return items.reduce(
    (sum, item) => band(sum.low + item.low, sum.base + item.base, sum.high + item.high),
    band(0, 0, 0),
  );
}

function scaleBand(unit, quantity) {
  return band(unit.low * quantity, unit.base * quantity, unit.high * quantity);
}

function present(value, step = 1000) {
  return {
    low: roundUsd(value.low, step),
    base: roundUsd(value.base, step),
    high: roundUsd(value.high, step),
  };
}

function cellProperties(cells, cellId) {
  const feature = (cells?.features ?? []).find(
    (item) => Number(item.properties?.cell_id) === Number(cellId),
  );
  return feature?.properties ?? {};
}

function ordered(value) {
  return value.low <= value.base && value.base <= value.high;
}

function drainageLine(projects, spec) {
  const cells = projects.length;
  const lengths = spec.length_m;
  const rates = spec.usd_per_reported_m;
  const quantity = {
    low: cells * lengths.low,
    base: cells * lengths.base,
    high: cells * lengths.high,
  };
  return {
    type: 'drainage',
    label: TYPE_LABEL.drainage,
    component: 'construction',
    assumedQuantity: quantity.base,
    quantityLabel: `${cells} corridor${cells === 1 ? '' : 's'} at ${lengths.low}/${lengths.base}/${lengths.high} m scenarios`,
    quantityNote: spec.length_note,
    low: quantity.low * rates.low,
    base: quantity.base * rates.base,
    high: quantity.high * rates.high,
    evidenceTier: spec.evidence_tier,
    sourceIds: spec.source_ids,
  };
}

function rwhLine(projects, cells, spec, participationShare) {
  const systems = projects.reduce((sum, project) => {
    const buildings = Number(cellProperties(cells, project.cell_id).buildings) || 0;
    return sum + rwhParticipatingSystems(buildings, participationShare);
  }, 0);
  const unit = spec.usd_per_system;
  const cost = scaleBand(unit, systems);
  return {
    type: 'rwh',
    label: TYPE_LABEL.rwh,
    component: 'equipment',
    assumedQuantity: systems,
    quantityLabel: `${systems} participating system${systems === 1 ? '' : 's'}`,
    quantityNote: spec.evidence_label,
    ...cost,
    evidenceTier: spec.evidence_tier,
    sourceIds: spec.source_ids,
  };
}

function restorationLine(projects, spec) {
  const packages = projects.length;
  const cost = scaleBand(spec.usd_per_package, packages);
  return {
    type: 'restoration',
    label: TYPE_LABEL.restoration,
    component: 'construction',
    assumedQuantity: packages,
    quantityLabel: `${packages} project-scale package${packages === 1 ? '' : 's'}`,
    quantityNote: spec.evidence_label,
    ...cost,
    evidenceTier: spec.evidence_tier,
    sourceIds: spec.source_ids,
  };
}

function costDriver(lines) {
  const construction = lines.filter((line) => line.component === 'construction');
  const drainage = construction.find((line) => line.type === 'drainage');
  if (drainage && drainage.high >= (construction[0]?.high ?? 0)) {
    return 'Drainage corridor length and heterogeneous local hydraulic comparators dominate capital uncertainty.';
  }
  if (lines.some((line) => line.type === 'restoration')) {
    return 'Restoration is a project-scale package with low evidence confidence because installed area is unknown.';
  }
  if (lines.some((line) => line.type === 'rwh')) {
    return 'Rainwater-harvesting system count follows the participation prior and a 2026-normalized procurement ceiling.';
  }
  return 'Quantity and evidence confidence still bound the envelope.';
}

export function estimatePortfolioCost({
  portfolio = [],
  cells = null,
  costContext = null,
  participationShare = RWH_ASSUMPTIONS.participationShare,
} = {}) {
  const projects = Array.isArray(portfolio) ? portfolio : [];
  const unpriced = [];
  const lines = [];

  if (!costContext?.interventions) {
    return {
      complete: false,
      unpriced: projects.length ? ['cost_context'] : [],
      confidence: 'pre-feasibility',
      lines: [],
      total: null,
      display: null,
    };
  }

  const grouped = {
    rwh: projects.filter((item) => item.type === 'rwh'),
    drainage: projects.filter((item) => item.type === 'drainage'),
    restoration: projects.filter((item) => item.type === 'restoration'),
  };
  const unknown = projects.filter((item) => !grouped[item.type]);
  if (unknown.length) unpriced.push(...unknown.map((item) => item.type));

  if (grouped.rwh.length) {
    const spec = costContext.interventions.rwh;
    if (!spec?.usd_per_system) unpriced.push('rwh');
    else lines.push(rwhLine(grouped.rwh, cells, spec, participationShare));
  }
  if (grouped.drainage.length) {
    const spec = costContext.interventions.drainage;
    if (!spec?.usd_per_reported_m || !spec.length_m) unpriced.push('drainage');
    else lines.push(drainageLine(grouped.drainage, spec));
  }
  if (grouped.restoration.length) {
    const spec = costContext.interventions.restoration;
    if (!spec?.usd_per_package) unpriced.push('restoration');
    else lines.push(restorationLine(grouped.restoration, spec));
  }

  const complete = unpriced.length === 0 && (projects.length === 0 || lines.length > 0);
  if (!complete) {
    return {
      complete: false,
      unpriced,
      confidence: 'pre-feasibility',
      lines: lines.map((line) => ({ ...line, display: present(line) })),
      total: null,
      display: null,
      priceDate: costContext.price_date ?? null,
      fx: costContext.fx ?? null,
    };
  }

  const construction = addBands(lines.filter((line) => line.component === 'construction'));
  const equipment = addBands(lines.filter((line) => line.component === 'equipment'));
  const rates = costContext.design_allowance ?? { low: 0, base: 0, high: 0 };
  const design = band(
    construction.low * rates.low,
    construction.base * rates.base,
    construction.high * rates.high,
  );
  const total = addBands([construction, equipment, design]);
  const sourceIds = [...new Set(lines.flatMap((line) => line.sourceIds ?? []))];
  if (rates.id || rates.source_id) sourceIds.push(rates.source_id ?? rates.id);

  return {
    complete: true,
    unpriced: [],
    confidence: 'pre-feasibility',
    priceDate: costContext.price_date,
    fx: costContext.fx,
    designAllowance: rates,
    lines: lines.map((line) => ({
      ...line,
      display: present(line, line.component === 'equipment' ? 10 : 1000),
    })),
    construction,
    equipment,
    design,
    total,
    display: {
      construction: present(construction),
      equipment: present(equipment, 10),
      design: present(design),
      total: present(total),
    },
    ordered: ordered(total),
    sourceIds,
    sources: (costContext.sources ?? []).filter((item) => sourceIds.includes(item.id)),
    costDriver: costDriver(lines),
    included: [
      'RWH tank packages at the planning participation prior',
      'drainage construction at named 40/60/80 m corridor scenarios',
      'restoration as a project-scale package when selected',
      'design allowance on construction (5% / 7.5% / 10%)',
    ].filter((item, index) => {
      if (index === 0) return grouped.rwh.length;
      if (index === 1) return grouped.drainage.length;
      if (index === 2) return grouped.restoration.length;
      return grouped.drainage.length || grouped.restoration.length;
    }),
    excluded: [
      'land acquisition',
      'construction supervision beyond the design allowance',
      'maintenance after handover',
      'an awarded Comuna 8 contract price',
      'surveyed corridor geometry',
    ],
  };
}
