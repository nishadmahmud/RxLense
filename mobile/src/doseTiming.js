/**
 * Parse BD-style dose lines like "1+0+1", "1+1+1 after meal", "1 + 0 + 0".
 * Returns morning / noon / night booleans. Unparseable → all false.
 */
export function parseDoseTiming(doseLine) {
  const empty = { morning: false, noon: false, night: false };
  if (!doseLine || typeof doseLine !== 'string') return empty;
  const m = doseLine.match(/(\d+)\s*\+\s*(\d+)\s*\+\s*(\d+)/);
  if (!m) return empty;
  return {
    morning: Number(m[1]) > 0,
    noon: Number(m[2]) > 0,
    night: Number(m[3]) > 0,
  };
}

export function hasAnyTiming(timing) {
  return !!(timing && (timing.morning || timing.noon || timing.night));
}
