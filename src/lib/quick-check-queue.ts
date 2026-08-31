// Holds the in-progress Quick Interaction Check queue across the scan/
// upload sub-pages' full navigations (sessionStorage, not state, because
// those pages are separate routes). Deliberately just a list of strings —
// the whole point of this flow is "trade name only, no details, nothing
// saved" — and deliberately per-tab/ephemeral, gone once the check runs or
// the tab closes.
const KEY = "wasfati-quick-check-queue";

export function getQuickCheckQueue(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function setQuickCheckQueue(queue: string[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(KEY, JSON.stringify(queue));
}

export function addToQuickCheckQueue(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;
  const queue = getQuickCheckQueue();
  if (queue.some((q) => q.toLowerCase() === trimmed.toLowerCase())) return;
  setQuickCheckQueue([...queue, trimmed]);
}

export function clearQuickCheckQueue() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(KEY);
}
