"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/components/providers/LanguageProvider";

/** Time-of-day greeting based on the VIEWER's device clock, not the
 * server's — rendered once after mount to avoid a hydration mismatch
 * (the server has no way to know the visitor's local time). Starts on
 * the morning greeting so the very first paint is stable between server
 * and client, then corrects itself immediately on mount. */
export function Greeting() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<"morning" | "afternoon" | "evening">("morning");

  useEffect(() => {
    // Reading the device clock is exactly the "sync with an external
    // system on mount" case useEffect exists for — there's no prop/state
    // to derive this from and no user event to hook into instead.
    const hour = new Date().getHours();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (hour >= 12 && hour < 18) setPeriod("afternoon");
    else if (hour >= 18) setPeriod("evening");
    else setPeriod("morning");
  }, []);

  const label =
    period === "afternoon" ? t.home.greetingAfternoon : period === "evening" ? t.home.greetingEvening : t.home.greetingMorning;

  return <>{label}</>;
}
