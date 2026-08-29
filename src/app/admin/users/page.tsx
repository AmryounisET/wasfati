import { requireAdmin } from "@/lib/supabase/admin";
import { UsersTable } from "./UsersTable";

export default async function AdminUsersPage() {
  const { supabase, role } = await requireAdmin();

  const { data: users, error } = await supabase.rpc("admin_list_users");

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-h1 font-bold text-ink-900">Users</h1>
        <p className="text-bodys text-ink-500">
          {users?.length ?? 0} registered {users?.length === 1 ? "user" : "users"}
        </p>
      </div>

      {error && <p className="mb-4 text-bodys text-danger-500">Failed to load users: {error.message}</p>}

      <UsersTable users={users ?? []} role={role} />
    </div>
  );
}
