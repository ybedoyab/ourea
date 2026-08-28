import { rainfallChip, rainfallHeadline } from '../config/climateCopy.js';
import { PRIORITY_CARDS, INTERVENTION_COPY } from '../config/uiCopy.js';
import { INTERVENTIONS, RWH_ASSUMPTIONS, SANDBOX_BBOX } from '../config/modelConfig.js';
import { BRAND } from '../config/brand.js';
import { estimatePortfolioCost, formatUsd, formatUsdMillionRange, formatUsdMillions, rwhParticipatingSystems } from './costEstimate.js';
import { EARLY_ACTION } from './earlyAction.js';
import { googleEarthLookUrl, googleMapsSearchUrl, ringCentroid, ringOf } from './placeLinks.js';
import { simulatorBaseUrl } from './sessionLink.js';

function joinCells(ids) {
  const cells = [...new Set(ids.map(Number))].filter(Number.isFinite);
  if (!cells.length) return 'the recommended cells';
  if (cells.length === 1) return `cell ${cells[0]}`;
  if (cells.length === 2) return `cells ${cells[0]} and ${cells[1]}`;
  return `cells ${cells.slice(0, -1).join(', ')} and ${cells[cells.length - 1]}`;
}

function typeLabel(type) {
  return INTERVENTIONS[type]?.label ?? type;
}

function typeVerb(type) {
  return INTERVENTION_COPY[type]?.mechanism
    ?? 'Stabilize slopes with vegetation and bioengineering';
}

function communityPlain(status) {
  if (status === 'community_reviewed') {
    return 'Community review has been recorded for the recommended projects.';
  }
  if (status === 'requires_deliberation') {
    return 'At least one project still needs community deliberation before going further.';
  }
  if (status === 'incomplete') {
    return 'Community review is incomplete. Treat this as a technical draft, not a validated social decision.';
  }
  return 'Community review has not been assessed. Do not read that as support or low social risk.';
}

function cellById(cells) {
  const map = new Map();
  for (const feature of cells?.features ?? []) {
    map.set(Number(feature.properties?.cell_id), feature);
  }
  return map;
}

function describeCellPlace(cellId, cell, centroid) {
  const col = cellId % 7;
  const row = Math.floor(cellId / 7);
  const eastWest = col <= 1 ? 'western' : col >= 5 ? 'eastern' : 'central';
  const band = row <= 1 ? 'lower slope' : row >= 5 ? 'upper slope' : 'mid-slope';
  const access = Number(cell.vehicular_access_m) > 120
    ? 'near the vehicle track'
    : Number(cell.pedestrian_access_m) > 120
      ? 'along pedestrian paths'
      : 'on the built hillside';
  const coords = centroid
    ? `${centroid[1].toFixed(4)} N, ${Math.abs(centroid[0]).toFixed(4)} W`
    : null;
  const where = `the ${band}, ${eastWest} part of Llanaditas No. 2 (Comuna 8)`;
  return coords
    ? `an 80 m planning square on ${where}, around ${coords}, ${access}`
    : `an 80 m planning square on ${where}, ${access}`;
}

function quantityFor(project, cell) {
  if (project.type === 'rwh') {
    const buildings = Math.round(Number(cell.buildings) || 0);
    const systems = rwhParticipatingSystems(buildings);
    return {
      quantity: systems,
      quantityLabel: `${systems} participating system${systems === 1 ? '' : 's'}`,
      quantityBasis: `${buildings} cadastral buildings × ${Math.round((RWH_ASSUMPTIONS.participationShare ?? 0.25) * 100)}% participation prior`,
    };
  }
  if (project.type === 'drainage') {
    return {
      quantity: 60,
      quantityLabel: '40 / 60 / 80 m corridor scenarios',
      quantityBasis: 'Planning-cell width is 80 m. Length is inferred for pre-feasibility, not surveyed geometry.',
    };
  }
  return {
    quantity: 1,
    quantityLabel: '1 project-scale package',
    quantityBasis: 'Comuna 8 DAGRD-scale bioengineering package; installed area is unknown.',
  };
}

function workOrder(project, feature) {
  const cell = feature?.properties ?? {};
  const cellId = Number(project.cell_id);
  const buildings = Math.round(Number(cell.buildings) || 0);
  const households = Math.round(Number(cell.households_proxy) || 0);
  const people = Math.round(Number(cell.population_proxy) || 0);
  const slope = Number(cell.mean_slope_deg) || 0;
  const highHazard = Math.round(Number(cell.high_hazard_buildings) || 0);
  const centroid = ringCentroid(ringOf(feature));
  const lng = centroid?.[0] ?? null;
  const lat = centroid?.[1] ?? null;
  return {
    cell_id: cellId,
    type: project.type,
    label: typeLabel(project.type),
    verb: typeVerb(project.type),
    buildings,
    households,
    people,
    slope,
    highHazard,
    place: describeCellPlace(cellId, cell, centroid),
    lng,
    lat,
    mapsUrl: googleMapsSearchUrl(lat, lng),
    earthUrl: googleEarthLookUrl(lat, lng),
    ...quantityFor(project, cell),
  };
}

function sixMonthPathway(orders) {
  const cells = joinCells(orders.map((item) => item.cell_id));
  const hasRwh = orders.some((item) => item.type === 'rwh');
  return [
    {
      title: 'Ourea deployment and decision preparation',
      body: 'Keep the sandbox, evidence pack and this brief as the shared decision object for municipal staff, designers and community leaders.',
    },
    {
      title: 'Site validation',
      body: `Walk ${cells} with residents and municipal counterparts. Confirm water paths, access and which buildings can actually host works.`,
    },
    {
      title: 'Community co-design',
      body: 'Record consent, livelihood, maintenance and access concerns before any trench or tank is specified. Community review is a gate, not a later annex.',
    },
    {
      title: 'Topographic and hydraulic survey',
      body: 'Survey corridor length and drainage catchments. Scenario lengths of 40, 60 and 80 m convert into a bill of quantities only after this survey.',
    },
    {
      title: '30% design',
      body: 'Produce a 30% package that a reviewer can price. Design allowance in this brief is not that package.',
    },
    {
      title: 'Procurement-ready bill of quantities',
      body: 'Return with quantities, specifications and a construction decision. This envelope is not an offer.',
    },
    {
      title: 'Demonstration rainwater harvesting',
      body: hasRwh
        ? 'Install demonstration tanks only if technically and socially validated on the walked roofs. Do not treat household count as people protected.'
        : 'No rainwater harvesting is in the active portfolio. Do not add tanks without a new decision.',
    },
    {
      title: 'Capital construction decision',
      body: 'A major hydraulic corridor is not assumed to be completed during a six-month pilot. Construction proceeds only after survey, 30% design and community review.',
    },
  ];
}

function changeTriggers(orders, costing) {
  const triggers = [
    'Community deliberation blocking or relocating a recommended cell.',
    'A rainfall context or policy priority that changes the robust portfolio, not only the score.',
  ];
  if (orders.some((item) => item.type === 'drainage')) {
    triggers.unshift('A surveyed drainage length outside the 40–80 m pre-feasibility scenarios.');
  }
  if (costing?.complete === false) {
    triggers.unshift('An intervention in the portfolio that still has no estimable cost scenario.');
  }
  return triggers;
}

function decisionText(orders, costing) {
  const cellPhrase = joinCells(orders.map((item) => item.cell_id));
  if (!costing?.complete || !costing.display?.total) {
    return `Decision requested: Fund site validation and 30% design for ${cellPhrase}, then return with a bill of quantities before construction approval. A complete US$ envelope cannot be shown until every selected intervention has an estimable scenario. Surveyed drainage length and community review are mandatory decision gates. Ourea identifies where to investigate and which portfolio remains robust; it does not predict which house will fail.`;
  }
  const { low, base, high } = costing.display.total;
  return `Decision requested: Fund site validation and 30% design for ${cellPhrase}, then return with a bill of quantities before construction approval. Current evidence places the package at a preliminary ${formatUsdMillionRange(low, high)} implementation envelope, with a ${formatUsdMillions(base)} base scenario. Surveyed drainage length and community review are mandatory decision gates. Ourea identifies where to investigate and which portfolio remains robust; it does not predict which house will fail.`;
}

export function buildDecisionBrief(payload, extras = {}) {
  const projects = payload?.portfolio ?? [];
  const cells = extras.cells ?? payload?.cells ?? null;
  const lookup = cellById(cells);
  const byType = ['rwh', 'drainage', 'restoration'].map((type) => ({
    type,
    label: typeLabel(type),
    verb: typeVerb(type),
    projects: projects.filter((project) => project.type === type),
  })).filter((group) => group.projects.length);

  const footprint = payload?.action_footprint ?? {};
  const uncertainty = payload?.uncertainty;
  const retention = uncertainty?.median
    ? Math.round((uncertainty.benefit_proxy_p10 / uncertainty.median) * 100)
    : null;
  const profileId = payload?.selected_ai_policy ?? 'balanced';
  const priority = PRIORITY_CARDS[profileId] ?? PRIORITY_CARDS.balanced;
  const presetId = payload?.scenario?.preset_id;
  const rainfall = rainfallChip(payload?.climate_context, { presetId });
  const communityStatus = payload?.community_safeguards?.validation_status;
  const orders = projects.map((project) => workOrder(project, lookup.get(Number(project.cell_id))));
  const costing = extras.costing ?? estimatePortfolioCost({
    portfolio: projects,
    cells,
    costContext: extras.costContext,
  });

  const envelope = costing.complete && costing.display?.total
    ? `${formatUsd(costing.display.total.low)}–${formatUsd(costing.display.total.high)} (base ${formatUsd(costing.display.total.base)})`
    : 'not estimable until every selected intervention has a cost scenario';

  const recommendation = byType.length
    ? `Recommend ${projects.length} intervention${projects.length === 1 ? '' : 's'} in ${BRAND.provingGround} using a ${priority.name.toLowerCase()} priority.`
    : 'No interventions are in the active portfolio.';

  const sites = (cells?.features ?? []).map((feature) => ({
    id: Number(feature.properties?.cell_id),
    ring: ringOf(feature),
    slope: Number(feature.properties?.mean_slope_deg) || 0,
    type: orders.find((item) => item.cell_id === Number(feature.properties?.cell_id))?.type ?? null,
  }));

  return {
    product: BRAND.name,
    slogan: BRAND.slogan,
    title: 'Decision brief',
    subtitle: extras.areaLabel ?? BRAND.provingGround,
    city: payload?.scope?.city ?? 'Medellín',
    generatedAt: payload?.generated_at ?? new Date().toISOString(),
    recommendation,
    decisionRequested: `Fund site validation and 30% design for ${joinCells(orders.map((item) => item.cell_id))}, then return with a bill of quantities before construction approval.`,
    rainfall,
    rainfallHeadline: rainfallHeadline(payload?.climate_context),
    priority: priority.name,
    priorityHow: priority.how,
    groups: byType,
    projects: orders,
    bbox: [...SANDBOX_BBOX],
    sites,
    pathway: sixMonthPathway(orders),
    footprint: {
      cells: footprint.planning_cells_targeted ?? orders.length,
      buildings: footprint.cadastral_buildings_in_targeted_cells ?? 0,
      highHazard: footprint.high_hazard_buildings_in_targeted_cells ?? 0,
      people: Math.round(footprint.population_proxy_in_targeted_cells ?? 0),
      households: orders.reduce((sum, item) => sum + item.households, 0),
    },
    robustness: uncertainty
      ? `In 90% of the modeled wet futures, this portfolio keeps at least ${Number(uncertainty.benefit_proxy_p10).toFixed(1)} of its planning benefit${retention != null ? ` (${retention}% of the typical outcome)` : ''}.`
      : 'Robustness has not been computed for this portfolio.',
    community: communityPlain(communityStatus),
    communityStatus,
    changeTriggers: changeTriggers(orders, costing),
    earlyAction: EARLY_ACTION,
    costing,
    envelope,
    decision: decisionText(orders, costing),
    caveats: [
      'Benefit numbers are planning proxies, not people saved or losses avoided.',
      'Household and population figures are census-based proxies, not a current household survey.',
      'Technically robust does not mean community-validated.',
    ],
    technicalNote: payload?.climate_context?.source_name
      ? `Specialist annex: rainfall contexts come from the ${payload.climate_context.source_name} record for ${payload.climate_context.climatology_period?.label ?? '1991-2020'}.`
      : null,
    reproducibleId: payload?.reproducible_id ?? null,
    simulatorUrl: extras.simulatorUrl ?? simulatorBaseUrl(),
    siteImage: extras.siteImage ?? extras.mapImage ?? null,
    aiReview: extras.aiReview ?? null,
  };
}
