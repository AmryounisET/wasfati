import { Screen } from "@/components/layout/Screen";

// Scoped to the (app) layout, so switching tabs keeps the bottom nav on
// screen and shows this skeleton in the page area. Without it, the only
// boundary above these pages is the root loading.tsx — a full-screen splash
// that replaced the whole UI (nav included) on every tab switch.
export default function AppLoading() {
  return (
    <Screen>
      <div className="animate-pulse space-y-4" aria-hidden>
        <div className="h-7 w-40 rounded-md bg-ink-100" />
        <div className="h-32 rounded-lg bg-ink-100" />
        <div className="h-20 rounded-lg bg-ink-100" />
        <div className="h-20 rounded-lg bg-ink-100" />
        <div className="h-20 rounded-lg bg-ink-100" />
      </div>
    </Screen>
  );
}
