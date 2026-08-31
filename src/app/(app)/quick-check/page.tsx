import { requirePatient } from "@/lib/supabase/patient";
import { QuickCheckClient } from "./QuickCheckClient";

export default async function QuickCheckPage() {
  await requirePatient();
  return <QuickCheckClient />;
}
