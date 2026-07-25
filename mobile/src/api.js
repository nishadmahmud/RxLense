import { API_BASE_URL } from './config';

const DEMO_TOKEN = process.env.EXPO_PUBLIC_DEMO_TOKEN || '';

/** Structured API failure — never put raw provider JSON in the UI. */
export class ApiError extends Error {
  constructor(message, { status = 0, code = '', retryAfterMs = 0, raw = '' } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.retryAfterMs = retryAfterMs;
    this.raw = raw;
  }

  get isQuota() {
    return (
      this.status === 429 ||
      this.code === 'RESOURCE_EXHAUSTED' ||
      /quota|resource.?exhausted|rate.?limit/i.test(`${this.raw} ${this.message}`)
    );
  }
}

function parseRetryAfterMs(text) {
  const m = String(text || '').match(/retry in\s+([\d.]+)\s*s/i);
  if (m) return Math.ceil(parseFloat(m[1]) * 1000);
  return 0;
}

function extractDetailString(detail) {
  if (!detail) return '';
  if (typeof detail === 'string') return detail;
  if (typeof detail === 'object') {
    if (typeof detail.message === 'string') return detail.message;
    try {
      return JSON.stringify(detail);
    } catch {
      return '';
    }
  }
  return String(detail);
}

/** Map any thrown/API failure to a short user-facing message. */
export function friendlyApiMessage(err, language = 'en') {
  const bn = language === 'bn';
  const status = err?.status || 0;
  const blob = `${err?.message || ''} ${err?.raw || ''}`;

  if (
    status === 429 ||
    err?.isQuota ||
    /quota|resource.?exhausted|rate.?limit|exceeded your current/i.test(blob)
  ) {
    return bn
      ? 'এআই এখন ব্যস্ত। একটু পরে আবার চেষ্টা করুন।'
      : 'The AI is busy right now. Please try again in a moment.';
  }
  if (
    status === 0 ||
    /network request failed|failed to fetch|networkerror/i.test(blob)
  ) {
    return bn
      ? 'সার্ভারে সংযোগ করা যায়নি। নেটওয়ার্ক চেক করে আবার চেষ্টা করুন।'
      : 'Could not reach the server. Check your connection and try again.';
  }
  if (status >= 500) {
    return bn
      ? 'সার্ভারে সমস্যা হয়েছে। একটু পরে আবার চেষ্টা করুন।'
      : 'Something went wrong on the server. Please try again shortly.';
  }
  // Keep short generic — never dump JSON
  if (/[{[]/.test(String(err?.message || '')) || /Gemma API error/i.test(blob)) {
    return bn
      ? 'অনুরোধ সম্পন্ন হয়নি। আবার চেষ্টা করুন।'
      : 'Something went wrong. Please try again.';
  }
  const clean = String(err?.message || '').trim();
  if (clean && clean.length < 160 && !/[{[]/.test(clean)) return clean;
  return bn
    ? 'অনুরোধ সম্পন্ন হয়নি। আবার চেষ্টা করুন।'
    : 'Something went wrong. Please try again.';
}

export function getRetryAfterMs(err) {
  if (err?.retryAfterMs > 0) return err.retryAfterMs;
  return parseRetryAfterMs(err?.raw || err?.message || '') || (err?.isQuota ? 45000 : 0);
}

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(DEMO_TOKEN ? { 'X-Demo-Token': DEMO_TOKEN } : {}),
    ...(options.headers || {}),
  };
  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw new ApiError('Network request failed', { status: 0, code: 'NETWORK' });
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    const raw =
      extractDetailString(detail) ||
      (typeof data.error === 'string' ? data.error : '') ||
      `Request failed (${res.status})`;
    const code =
      (detail && typeof detail === 'object' && detail.status) ||
      data.status ||
      '';
    throw new ApiError(raw, {
      status: res.status,
      code: String(code || ''),
      retryAfterMs: parseRetryAfterMs(raw),
      raw,
    });
  }
  return data;
}

export function analyzePrescription({ imageBase64, ocrHint, language, demoPreset }) {
  return request('/api/analyze', {
    method: 'POST',
    body: JSON.stringify({
      imageBase64,
      ocrHint,
      language,
      demoPreset,
    }),
  });
}

export function generateBrief({ medicines, patientContext, language, confirmUnmatched, clinicalContext }) {
  return request('/api/brief', {
    method: 'POST',
    body: JSON.stringify({
      medicines,
      patientContext,
      language,
      confirmUnmatched,
      clinicalContext,
    }),
  });
}

export function searchMedicines(q) {
  return request(`/api/medicines/search?q=${encodeURIComponent(q || '')}`);
}

export function getMedicine(id) {
  return request(`/api/medicines/${encodeURIComponent(id)}`);
}

export function lookupPrices(q) {
  return request(`/api/prices?q=${encodeURIComponent(q || '')}`);
}

export function chatWithGemma({ messages, language, profileContext, scanContext, imageBase64 }) {
  return request('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      messages,
      language,
      profileContext,
      scanContext,
      imageBase64,
    }),
  });
}

export function missedDoseCoach({ medicine, whenMissed, patientContext, language }) {
  return request('/api/coach/missed-dose', {
    method: 'POST',
    body: JSON.stringify({ medicine, whenMissed, patientContext, language }),
  });
}

export function healthCheck() {
  return request('/api/health');
}
