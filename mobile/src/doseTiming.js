/**
 * Parse BD-style dose lines: "1+0+1", "1 0 0", "1-0-0", Bangla digits, meal words.
 * Returns morning / noon / night booleans. Unparseable → all false.
 */

const BN_DIGITS = {
  '০': '0',
  '১': '1',
  '২': '2',
  '৩': '3',
  '৪': '4',
  '৫': '5',
  '৬': '6',
  '৭': '7',
  '৮': '8',
  '৯': '9',
};

function toAsciiDigits(s) {
  return String(s).replace(/[০-৯]/g, (ch) => BN_DIGITS[ch] ?? ch);
}

const EMPTY = { morning: false, noon: false, night: false };

/** Match N[+| |−|-|–]N[+| |−|-|–]N anywhere in the line. */
const TRIPLE_RE = /(\d+)\s*[+\-–−]\s*(\d+)\s*[+\-–−]\s*(\d+)/;
const SPACE_TRIPLE_RE = /(\d+)\s+(\d+)\s+(\d+)(?!\s*\d)/;

export function parseDoseTiming(doseLine) {
  if (!doseLine || typeof doseLine !== 'string') return { ...EMPTY };
  const text = toAsciiDigits(doseLine);
  let m = text.match(TRIPLE_RE);
  if (!m) m = text.match(SPACE_TRIPLE_RE);
  if (!m) return { ...EMPTY };
  return {
    morning: Number(m[1]) > 0,
    noon: Number(m[2]) > 0,
    night: Number(m[3]) > 0,
  };
}

export function hasAnyTiming(timing) {
  return !!(timing && (timing.morning || timing.noon || timing.night));
}

/** Human label: "Morning · Night" (locale via language labels map). */
export function formatDoseSlots(timingOrDoseLine, labels) {
  const slots =
    typeof timingOrDoseLine === 'string'
      ? parseDoseTiming(timingOrDoseLine)
      : timingOrDoseLine || EMPTY;
  const L = labels || { morning: 'Morning', noon: 'Noon', night: 'Night' };
  const parts = [];
  if (slots.morning) parts.push(L.morning);
  if (slots.noon) parts.push(L.noon);
  if (slots.night) parts.push(L.night);
  return parts.join(' · ');
}

/**
 * Normalize first BD triple in a dose line to N+N+N, keep trailing meal words.
 * Returns original string if unparseable.
 */
export function normalizeDoseLine(doseLine) {
  if (!doseLine || typeof doseLine !== 'string') return doseLine || '';
  const text = toAsciiDigits(doseLine);
  let m = text.match(TRIPLE_RE);
  if (!m) m = text.match(SPACE_TRIPLE_RE);
  if (!m) return doseLine;
  const canon = `${Number(m[1])}+${Number(m[2])}+${Number(m[3])}`;
  const rest = text.slice(m.index + m[0].length).trim();
  return rest ? `${canon} ${rest}` : canon;
}

/** Map parse slots → Morning / Afternoon / Night keys used in briefing schedule. */
export function slotsToTimeOfDay(timing) {
  const out = [];
  if (timing?.morning) out.push('Morning');
  if (timing?.noon) out.push('Afternoon');
  if (timing?.night) out.push('Night');
  return out;
}

/**
 * Build schedule-like buckets from a list of meds with doseLine / timing strings.
 * Returns [{ timeOfDay, medicines: [{...med}], mealTiming }].
 */
export function groupMedsByTimeOfDay(meds) {
  const order = ['Morning', 'Afternoon', 'Night'];
  const buckets = {
    Morning: [],
    Afternoon: [],
    Night: [],
  };
  const mealBySlot = { Morning: '', Afternoon: '', Night: '' };

  for (const med of meds || []) {
    const parsed = parseDoseTiming(med.doseLine);
    let slots = slotsToTimeOfDay(parsed);
    if (!slots.length && med.timing) {
      const t = String(med.timing);
      for (const key of order) {
        if (t.toLowerCase().includes(key.toLowerCase()) || (key === 'Afternoon' && /noon/i.test(t))) {
          slots.push(key);
        }
      }
    }
    if (!slots.length) {
      // Unplaced — still show under Morning as a soft bucket only if we have mealTiming alone
      continue;
    }
    for (const slot of slots) {
      buckets[slot].push(med);
      if (med.mealTiming && !mealBySlot[slot]) mealBySlot[slot] = med.mealTiming;
    }
  }

  return order
    .filter((k) => buckets[k].length)
    .map((timeOfDay) => ({
      timeOfDay,
      medicines: buckets[timeOfDay],
      mealTiming: mealBySlot[timeOfDay] || '',
    }));
}
