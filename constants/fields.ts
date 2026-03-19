// ------------------------------------------------------------------
// Timmi resource IDs for Oulu fields
// Find more by opening the weekView in a browser and checking
// the calendarAjax.do requests in DevTools Network tab.
// ------------------------------------------------------------------

export const TIMMI_BASE_URL = 'https://timmi.ouka.fi/WebTimmi';

export const FIELDS = {
  HEINAPAA_LOHKO_1: 11102,
  HEINAPAA_LOHKO_2: 11103,
  HEINAPAA_LOHKO_3: 11104,
  CASTRENI_TN:      11105,
  CASTRENI_TNA:     11106,
  CASTRENI_TNB:     11107,
  HAUKIPUDAS_UK:    11108,
} as const;

export type FieldId = typeof FIELDS[keyof typeof FIELDS];

export const FIELD_LABELS: Record<number, string> = {
  [FIELDS.HEINAPAA_LOHKO_1]: 'Heinäpää – Lohko 1',
  [FIELDS.HEINAPAA_LOHKO_2]: 'Heinäpää – Lohko 2',
  [FIELDS.HEINAPAA_LOHKO_3]: 'Heinäpää – Lohko 3',
  [FIELDS.CASTRENI_TN]:      'Castréni – TN',
  [FIELDS.CASTRENI_TNA]:     'Castréni – TN/A',
  [FIELDS.CASTRENI_TNB]:     'Castréni – TN/B',
  [FIELDS.HAUKIPUDAS_UK]:    'Haukipudas – Urheilukenttä',
};

// Default list shown in the app
export const DEFAULT_FIELD_IDS: number[] = [
  FIELDS.HEINAPAA_LOHKO_1,
  FIELDS.HEINAPAA_LOHKO_2,
  FIELDS.CASTRENI_TN,
  FIELDS.HAUKIPUDAS_UK,
];
