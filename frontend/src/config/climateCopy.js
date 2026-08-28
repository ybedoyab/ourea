const PERCENTILE_PLAIN = Object.freeze({
  75: 'wetter than 3 in 4 past periods',
  90: 'wetter than 9 in 10 past periods',
  99: 'among the wettest periods on record',
});

export function climatologyYears(climate) {
  const label = climate?.climatology_period?.label ?? climate?.climatology_period;
  if (!label) return '1991–2020';
  return String(label).replace('-', '–');
}

export function rainfallHeadline(climate) {
  return `Observed rainfall for this hillside, ${climatologyYears(climate)}`;
}

export function rainfallChip(climate, scenario) {
  const presetLabel = scenario?.presetId === 'explore'
    ? 'Custom rainfall context'
    : scenario?.presetId === 'high_rainfall'
      ? 'High rainfall'
      : scenario?.presetId === 'extreme_observed'
        ? 'Extreme observed rainfall'
        : 'Typical wet conditions';
  return `${presetLabel} · ${climatologyYears(climate)}`;
}

export function plainPresetCaption(preset) {
  const mm = Number(preset?.precipitation_mm);
  const days = Number(preset?.accumulation_window_days) || 15;
  const percentile = Number(preset?.percentile);
  const amount = Number.isFinite(mm) ? `About ${Math.round(mm)} mm over ${days} days` : `${days}-day rainfall`;
  const comparison = PERCENTILE_PLAIN[percentile] ?? 'compared with past wet periods';
  return `${amount} — ${comparison}`;
}

export function plainClimateFacts(climate) {
  return [
    { label: 'What this is', value: 'Observed rainfall, not a forecast' },
    { label: 'Years used', value: climatologyYears(climate) },
    { label: 'Where', value: 'Llanaditas / upper Comuna 8' },
    { label: 'Used for', value: 'Comparing typical, high and extreme wet conditions' },
  ];
}
