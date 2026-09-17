import { redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/server";

export default async function RootPage() {
  const user = await getUser();

  redirect(user ? "/home" : "/login");
}
