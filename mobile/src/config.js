import { Platform } from 'react-native';
import Constants from 'expo-constants';

function resolveDevApiBaseUrl() {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    Constants.manifest2?.extra?.expoGo?.debuggerHost ||
    Constants.manifest?.debuggerHost;

  if (hostUri) {
    const host = String(hostUri).split(':')[0];
    if (host) return `http://${host}:4000`;
  }

  if (Platform.OS === 'android') return 'http://10.0.2.2:4000';
  return 'http://localhost:4000';
}

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || resolveDevApiBaseUrl();

export function disclaimerFor(language) {
  if (language === 'bn') {
    return (
      'RxLens AI একটি শিক্ষামূলক প্রেসক্রিপশন সহায়ক। এটি রোগ নির্ণয় বা ওষুধ নির্ধারণ করে না ' +
      'এবং ডাক্তার বা ফার্মাসিস্টের বিকল্প নয়। সর্বদা আপনার চিকিৎসকের পরামর্শ মেনে চলুন। ' +
      'শ্বাসকষ্ট, ফোলা বা তীব্র অ্যালার্জি হলে জরুরি চিকিৎসা নিন।'
    );
  }
  return (
    'RxLens AI is an educational prescription companion. It does not diagnose, prescribe, or replace ' +
    'a doctor or pharmacist. Always follow your clinician advice. Seek emergency care for severe symptoms.'
  );
}

export const DISCLAIMER = disclaimerFor('en');
