import { rainfallChip, rainfallHeadline } from '../config/climateCopy.js';
import { PRIORITY_CARDS, INTERVENTION_COPY } from '../config/uiCopy.js';
import { INTERVENTIONS, RWH_ASSUMPTIONS, SANDBOX_BBOX } from '../config/modelConfig.js';
import { BRAND } from '../config/brand.js';
import { googleEarthLookUrl, googleMapsSearchUrl, ringCentroid, ringOf } from './placeLinks.js';
import { simulatorBaseUrl } from './sessionLink.js';

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

function workOrder(project, feature) {
  const cell = feature?.properties ?? {};
  const cellId = Number(project.cell_id);
  const buildings = Math.round(Number(cell.buildings) || 0);
  const households = Math.round(Number(cell.households_proxy) || 0);
  const people = Math.round(Number(cell.population_proxy) || 0);
  const slope = Number(cell.mean_slope_deg) || 0;
  const highHazard = Math.round(Number(cell.high_hazard_buildings) || 0);
  const roofM2 = Math.round(Number(cell.roof_footprint_m2) || 0);
  const centroid = ringCentroid(ringOf(feature));
  const place = describeCellPlace(cellId, cell, centroid);
  const lng = centroid?.[0] ?? null;
  const lat = centroid?.[1] ?? null;
  const links = {
    lng,
    lat,
    mapsUrl: googleMapsSearchUrl(lat, lng),
    earthUrl: googleEarthLookUrl(lat, lng),
  };

  if (project.type === 'rwh') {
    const participating = Math.max(1, Math.round(buildings * (RWH_ASSUMPTIONS.participationShare ?? 0.25)));
    const installers = Math.max(4, Math.ceil(participating / 8));
    const weeks = Math.max(2, Math.ceil(participating / 12));
    return {
      cell_id: cellId,
      type: project.type,
      label: typeLabel(project.type),
      credits: INTERVENTIONS[project.type]?.costCredits ?? 0,
      buildings,
      households,
      people,
      slope,
      highHazard,
      place,
      crew: `1 coordinator, 2 technicians, ${installers} community installers`,
      crewCount: 3 + installers,
      duration: `${weeks} weeks after gutters and tanks are specified`,
      weeks,
      firstTask: `Walk roofs in cell ${cellId}. Confirm which of the ${buildings} cadastral buildings can take a tank (planning prior: about ${participating} participating roofs, ${RWH_ASSUMPTIONS.storageM3PerParticipatingBuilding} m³ each).`,
      how: 'Fit gutters, downpipes and storage so roof water does not run onto the slope. Train households to empty and maintain tanks.',
      ...links,
    };
  }

  if (project.type === 'drainage') {
    return {
      cell_id: cellId,
      type: project.type,
      label: typeLabel(project.type),
      credits: INTERVENTIONS[project.type]?.costCredits ?? 0,
      buildings,
      households,
      people,
      slope,
      highHazard,
      place,
      crew: '1 civil supervisor, 6 local workers, 1 community liaison',
      crewCount: 8,
      duration: '4-6 weeks on the corridor after survey and design',
      weeks: 5,
      firstTask: `Walk the drainage line in cell ${cellId} with residents. Mark where water concentrates (slope about ${slope.toFixed(0)}°, ${highHazard} high-hazard buildings in the cell).`,
      how: 'Move concentrated runoff away from exposed cells with a designed corridor, not an informal ditch. Keep access paths open during works.',
      ...links,
    };
  }

  return {
    cell_id: cellId,
    type: project.type,
    label: typeLabel(project.type),
    credits: INTERVENTIONS[project.type]?.costCredits ?? 0,
    buildings,
    households,
    people,
    slope,
    highHazard,
    roofM2,
    place,
    crew: '1 bioengineering lead, 8 community workers, 1 nursery support',
    crewCount: 10,
    duration: '3-6 weeks to plant; about 3 years to mature',
    weeks: 4,
    firstTask: `Stake planting lines on the slope in cell ${cellId} with residents. Do not start where a live drainage line still needs to be moved.`,
    how: 'Stabilize the slope with vegetation and bioengineering. Restoration is not immediate protection; it needs care through the first wet seasons.',
    ...links,
  };
}

function buildPhases(orders, footprint, communityStatus) {
  const drainage = orders.filter((item) => item.type === 'drainage');
  const rwh = orders.filter((item) => item.type === 'rwh');
  const restoration = orders.filter((item) => item.type === 'restoration');
  const households = orders.reduce((sum, item) => sum + item.households, 0);
  const consentNote = communityStatus === 'community_reviewed'
    ? 'Community review is already recorded; still walk each site before breaking ground.'
    : 'Community review is not complete. Treat consent as a gate, not a later paperwork step.';

  const phases = [
    {
      title: 'Convene and walk the hillside',
      duration: 'Weeks 1-2',
      people: '12-20 people in the room, then a walking group of 8-12 on site',
      body: `Hold a planning meeting with JAC / Llanaditas leaders, residents from the ${footprint.cells} targeted cells, municipal risk staff and the design team. ${consentNote} This brief is the decision to discuss, not a construction drawing.`,
    },
    {
      title: 'Survey, design and a real budget',
      duration: 'Weeks 2-6',
      people: '1 municipal owner, 1 design engineer, 1 community liaison',
      body: `Commission topographic and drainage design for the marked cells. Convert ${footprint.creditsSpent} planning credits into a COP budget before procurement. Credits compare options; they are not pesos.`,
    },
  ];
  if (drainage.length) {
    phases.push({
      title: 'Move water first (drainage)',
      duration: 'Weeks 6-12',
      people: `${drainage.reduce((sum, item) => sum + item.crewCount, 0)} field people if cells run in parallel; better to sequence one corridor crew of 8`,
      body: `Build drainage upgrades in cells ${drainage.map((item) => item.cell_id).join(', ')} before adding storage or plants. Each corridor needs a civil supervisor, six local workers and a liaison (${drainage[0].duration}).`,
    });
  }
  if (rwh.length) {
    phases.push({
      title: 'Capture roof water (rainwater harvesting)',
      duration: 'After drainage is flowing',
      people: `About ${Math.max(...rwh.map((item) => item.crewCount))} people on the largest cell crew; do not install every cell at once`,
      body: `Install household systems in cells ${rwh.map((item) => item.cell_id).join(', ')}. Planning prior: about ${Math.round((RWH_ASSUMPTIONS.participationShare ?? 0.25) * 100)}% of buildings in a cell take a tank. Roughly ${households || 'the listed'} households (census proxy) live in targeted cells - use that to size outreach, not as a headcount of people protected.`,
    });
  }
  if (restoration.length) {
    phases.push({
      title: 'Stabilize slopes (restoration)',
      duration: 'Planting season; 3 years to mature',
      people: '10 people per cell crew, plus household aftercare',
      body: `Plant and bioengineer cells ${restoration.map((item) => item.cell_id).join(', ')} only after water is no longer cutting the slope. Restoration needs care through the first wet seasons and is not a real-time warning system.`,
    });
  }
  phases.push({
    title: 'Handover and maintenance',
    duration: 'Ongoing',
    people: '1 liaison plus trained households and a municipal inspection visit each wet season',
    body: 'Leave a simple maintenance card per site: who clears the tank, who walks the drain, who waters plants. Do not treat map colors as landslide probability.',
  });
  return phases;
}

function buildCosting(orders, spent, available) {
  const rows = ['drainage', 'rwh', 'restoration'].map((type) => {
    const items = orders.filter((item) => item.type === type);
    if (!items.length) return null;
    const credits = items.reduce((sum, item) => sum + (item.credits || 0), 0);
    const personWeeks = items.reduce((sum, item) => sum + (item.crewCount || 0) * (item.weeks || 4), 0);
    const buy = {
      drainage: 'One corridor crew to move concentrated runoff off the slope.',
      rwh: 'Household tank packages so roof water does not run onto the hillside.',
      restoration: 'Planting and bioengineering; planning effect matures over about 3 years.',
    }[type];
    return {
      type,
      label: typeLabel(type),
      count: items.length,
      credits,
      personWeeks,
      share: spent ? credits / spent : 0,
      buy,
    };
  }).filter(Boolean);
  return {
    spent,
    available,
    rows,
    personWeeks: rows.reduce((sum, row) => sum + row.personWeeks, 0),
    copNote: 'Planning credits compare options. They are not Colombian pesos. After topographic design, convert these shares into a COP bill of quantities.',
    ifNothing: 'If the city does nothing, the baseline climate-stress index stays on the cadastral buildings in these cells. Ourea does not predict houses collapsing or the year a slope fails.',
    when: [
      { label: 'Drainage and rainwater harvesting', body: 'In the model their effect is immediate after construction (maturity 0 years). The first wet season after works is the planning test, not a collapse countdown.' },
      { label: 'Restoration', body: 'Needs about 3 years to mature. It is not a real-time warning system and does not pin a failure date.' },
      { label: 'Do-nothing path', body: 'Stress remains on the same buildings. That is a planning warning, not a forecast that houses fall in year X.' },
    ],
  };
}

function buildingsForFigure(buildings, cellIds) {
  const wanted = new Set(cellIds);
  return (buildings?.features ?? [])
    .filter((feature) => wanted.has(Number(feature.properties?.cell_id)))
    .map((feature) => ({
      ring: ringOf(feature),
      cellId: Number(feature.properties?.cell_id),
      hazard: feature.properties?.hazard_max,
      stress: Number(feature.properties?.baseline_stress_preview) || 0,
      floors: Number(feature.properties?.numero_pisos) || 1,
    }))
    .sort((a, b) => b.stress - a.stress)
    .slice(0, 180);
}

export function buildDecisionBrief(payload, extras = {}) {
  const projects = payload?.portfolio ?? [];
  const cells = extras.cells ?? payload?.cells ?? null;
  const lookup = cellById(cells);
  const byType = ['rwh', 'drainage', 'restoration'].map((type) => ({
    type,
    label: typeLabel(type),
    verb: typeVerb(type),
    credits: INTERVENTIONS[type]?.costCredits ?? 0,
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
  const households = orders.reduce((sum, item) => sum + item.households, 0);
  const peakCrew = orders.reduce((max, item) => Math.max(max, item.crewCount), 0);
  const sequencedPeak = 4 + Math.max(peakCrew, 8);

  const recommendation = byType.length
    ? `Recommend ${projects.length} interventions in ${BRAND.provingGround}, using a ${priority.name.toLowerCase()} priority and ${payload?.budget?.spent ?? 0} of ${payload?.budget?.available ?? 0} planning credits.`
    : 'No interventions are in the active portfolio.';

  const sites = (cells?.features ?? []).map((feature) => ({
    id: Number(feature.properties?.cell_id),
    ring: ringOf(feature),
    slope: Number(feature.properties?.mean_slope_deg) || 0,
    type: orders.find((item) => item.cell_id === Number(feature.properties?.cell_id))?.type ?? null,
  }));

  const phases = buildPhases(
    orders,
    {
      cells: footprint.planning_cells_targeted ?? orders.length,
      creditsSpent: payload?.budget?.spent ?? 0,
    },
    communityStatus,
  );

  return {
    product: BRAND.name,
    slogan: BRAND.slogan,
    title: 'Decision brief',
    subtitle: extras.areaLabel ?? BRAND.provingGround,
    city: payload?.scope?.city ?? 'Medellín',
    generatedAt: payload?.generated_at ?? new Date().toISOString(),
    recommendation,
    rainfall,
    rainfallHeadline: rainfallHeadline(payload?.climate_context),
    priority: priority.name,
    priorityHow: priority.how,
    budgetSpent: payload?.budget?.spent ?? 0,
    budgetAvailable: payload?.budget?.available ?? 0,
    groups: byType,
    projects: orders,
    bbox: [...SANDBOX_BBOX],
    sites,
    phases,
    team: {
      core: [
        '1 municipal project owner for the whole package',
        '1 community liaison from Llanaditas / JAC',
        '1 design engineer shared across cells',
        '1 risk-management counterpart for slope safety',
      ],
      kickoff: '12–20 people at the first meeting (leaders, residents from targeted cells, municipal staff, designer)',
      peakOnSite: `${sequencedPeak} people on the hillside if one works crew runs with the core team (do not mobilize every cell crew at once)`,
      households: households,
      note: 'Crew sizes are planning estimates for discussion, not a contract or a health-and-safety plan.',
    },
    footprint: {
      cells: footprint.planning_cells_targeted ?? 0,
      buildings: footprint.cadastral_buildings_in_targeted_cells ?? 0,
      highHazard: footprint.high_hazard_buildings_in_targeted_cells ?? 0,
      people: Math.round(footprint.population_proxy_in_targeted_cells ?? 0),
      households,
    },
    robustness: uncertainty
      ? `In 90% of the modeled wet futures, this portfolio keeps at least ${Number(uncertainty.benefit_proxy_p10).toFixed(1)} of its planning benefit${retention != null ? ` (${retention}% of the typical outcome)` : ''}.`
      : 'Robustness has not been computed for this portfolio.',
    community: communityPlain(communityStatus),
    communityStatus,
    nextSteps: phases.map((phase) => `${phase.title}: ${phase.body}`),
    caveats: [
      'Benefit numbers are planning proxies, not people saved or losses avoided.',
      'Planning credits compare options; they are not Colombian pesos.',
      'Household and population figures are census-based proxies, not a current household survey.',
      'Crew sizes are planning estimates to start a conversation with the community and the city.',
      'Technically robust does not mean community-validated.',
    ],
    technicalNote: payload?.climate_context?.source_name
      ? `Specialist annex: rainfall contexts come from the ${payload.climate_context.source_name} record for ${payload.climate_context.climatology_period?.label ?? '1991-2020'}.`
      : null,
    reproducibleId: payload?.reproducible_id ?? null,
    mapImage: extras.mapImage ?? null,
    figureImage: extras.figureImage ?? null,
    simulatorUrl: extras.simulatorUrl ?? simulatorBaseUrl(),
    buildings: buildingsForFigure(extras.buildings, orders.map((item) => item.cell_id)),
    costing: buildCosting(
      orders,
      payload?.budget?.spent ?? 0,
      payload?.budget?.available ?? 0,
    ),
  };
}
