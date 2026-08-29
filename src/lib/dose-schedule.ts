// Wasfati doesn't (yet) have a dose-scheduling engine — `dose_logs` rows are
// created on demand when the patient confirms a dose (see schema.sql). Until
// a real scheduler exists, "today's doses" is derived from each active
// medication's free-text time-of-day keyword, and "missed" is a same-day
// heuristic based on how far past that time-of-day window we are.

const TIME_OF_DAY_HOUR: Record<string, number> = {
  "صباحاً": 10,
  "صباحا": 10,
  "ظهراً": 15,
  "ظهرا": 15,
  "مساء": 20,
  "مساءً": 20,
  "قبل النوم": 23,
};

export function extractTimeOfDay(frequencyText: string): string | null {
  for (const keyword of Object.keys(TIME_OF_DAY_HOUR)) {
    if (frequencyText.includes(keyword)) return keyword;
  }
  return null;
}

export function isDueDosePast(frequencyText: string, now: Date = new Date()): boolean {
  const keyword = extractTimeOfDay(frequencyText);
  if (!keyword) return false;
  return now.getHours() >= TIME_OF_DAY_HOUR[keyword];
}
