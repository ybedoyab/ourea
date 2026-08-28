import cityScreenContract from '../config/cityScreenContract.json' with { type: 'json' };
import { CITY_LENSES } from '../config/uiCopy.js';
import { numeric } from './numeric.js';

export const CITY_SCREEN_CONTRACT = Object.freeze({
  ...cityScreenContract,
  rankable_population_match_values: Object.freeze([
    ...cityScreenContract.rankable_population_match_values,
  ]),
});

const RANKABLE_MATCH = new Set(CITY_SCREEN_CONTRACT.rankable_population_match_values);

export function lensConfig(lensId) {
  return CITY_LENSES[lensId] ?? CITY_LENSES.balanced;
}

export function isRankableCityFeature(feature, lensId) {
  const properties = feature?.properties ?? {};
  const lens = lensConfig(lensId);
  const rank = numeric(properties[lens.rankField]);
  const population = numeric(properties.population_2026);
  const score = numeric(properties[lens.scoreField]);
  return (
    rank != null
    && Number.isInteger(rank)
    && rank >= 1
    && population != null
    && population > 0
    && score != null
    && RANKABLE_MATCH.has(properties.population_match)
  );
}

export function topScreening(screening, lensId, limit = 8) {
  if (!screening?.features?.length) return [];
  const lens = lensConfig(lensId);
  return [...screening.features]
    .filter((feature) => isRankableCityFeature(feature, lensId))
    .sort(
      (a, b) =>
        numeric(a.properties[lens.rankField]) - numeric(b.properties[lens.rankField]),
    )
    .slice(0, limit);
}

export function countSafePopulationMatches(screening) {
  return (screening?.features ?? []).filter((feature) => {
    const population = numeric(feature.properties?.population_2026);
    return (
      RANKABLE_MATCH.has(feature.properties?.population_match)
      && population != null
      && population > 0
    );
  }).length;
}

export function countSpatialPolygons(screening) {
  return screening?.features?.length ?? 0;
}
