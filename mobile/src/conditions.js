export const CONDITION_CATALOG = [
  { id: 'bp', label: 'High blood pressure (BP)', labelBn: 'উচ্চ রক্তচাপ' },
  { id: 'diabetes', label: 'Diabetes', labelBn: 'ডায়াবেটিস' },
  { id: 'asthma', label: 'Asthma', labelBn: 'হাঁপানি' },
  { id: 'heart', label: 'Heart disease', labelBn: 'হৃদরোগ' },
  { id: 'thyroid', label: 'Thyroid', labelBn: 'থাইরয়েড' },
  { id: 'pud', label: 'Ulcer / acidity (PUD)', labelBn: 'আলসার / অ্যাসিডিটি' },
  { id: 'kidney', label: 'Kidney issues', labelBn: 'কিডনি সমস্যা' },
  { id: 'liver', label: 'Liver issues', labelBn: 'লিভার সমস্যা' },
  { id: 'pregnancy', label: 'Pregnancy', labelBn: 'গর্ভধারণ' },
  { id: 'breastfeeding', label: 'Breastfeeding', labelBn: 'স্তন্যদান' },
  { id: 'allergy', label: 'Drug allergy', labelBn: 'ওষুধে অ্যালার্জি' },
  { id: 'gout', label: 'Gout', labelBn: 'গাউট' },
];

export function ageBandFromYears(age) {
  const n = Number(age);
  if (!n || n < 18) return 'child';
  if (n >= 65) return 'older_adult';
  return 'adult';
}
