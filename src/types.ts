export type VariableType = 'boolean' | 'number' | 'time' | 'slider';

export interface VariableDef {
  id: string;
  label: string;
  type: VariableType;
  min?: number;
  max?: number;
}

export type SleepLog = {
  date: string; // YYYY-MM-DD
  // Dependent Variables
  total_sleep_time: number;
  deep_sleep_time: number;
  awakenings: number;
  watch_sleep_score: number; // 0-100
  subjective_quality: number; // 1-10
  // Dynamic Independent Variables
  [key: string]: any;
};

export const DEFAULT_VARIABLES: VariableDef[] = [
  { id: 'morning_supplements', label: 'Morning Supplements', type: 'boolean' },
  { id: 'caffeine_after_12pm', label: 'Caffeine after 12pm', type: 'boolean' },
  { id: 'daytime_nap', label: 'Daytime Nap (mins)', type: 'number' },
  { id: 'late_night_snack', label: 'Late Night Snack', type: 'boolean' },
  { id: 'magnesium_zinc', label: 'Magnesium & Zinc', type: 'boolean' },
  { id: 'screen_free_1hr', label: 'Screen Free 1hr', type: 'boolean' },
  { id: 'worry_journal', label: 'Worry Journal', type: 'boolean' },
  { id: 'co_sleeping', label: 'Co-sleeping', type: 'boolean' },
  { id: 'ac_temp_optimal', label: 'AC cold enough', type: 'boolean' },
];

export const INITIAL_LOG: SleepLog = {
  date: new Date().toISOString().split('T')[0],
  total_sleep_time: 7.5,
  deep_sleep_time: 1.5,
  awakenings: 0,
  watch_sleep_score: 80,
  subjective_quality: 7,
  // defaults for dynamic vars are injected dynamically
};

