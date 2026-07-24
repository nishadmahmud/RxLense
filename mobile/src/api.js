import { API_BASE_URL } from './config';

const DEMO_TOKEN = process.env.EXPO_PUBLIC_DEMO_TOKEN || '';

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
    throw new Error('Network request failed');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = data.detail;
    let msg = data.error || `Request failed (${res.status})`;
    if (typeof detail === 'string') msg = detail;
    else if (detail && typeof detail === 'object') msg = detail.message || JSON.stringify(detail);
    throw new Error(msg);
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
