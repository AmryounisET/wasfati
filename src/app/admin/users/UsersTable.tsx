"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ShieldOff, ShieldCheck, Plus, Copy, KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { logAdminAction } from "@/lib/admin/audit";
import { extractFunctionError } from "@/lib/edge-function-error";
import { Modal } from "@/components/ui/Modal";
import { TextField } from "@/components/ui/TextField";
import { Button } from "@/components/ui/Button";
import { Pagination } from "@/components/ui/Pagination";
import type { AdminRole, AdminUserDirectoryRow, UserType } from "@/lib/supabase/types";

const USER_TYPES: UserType[] = ["patient", "student", "provider"];
const PAGE_SIZE = 50;

export function UsersTable({
  users: initialUsers,
  role,
}: {
  users: AdminUserDirectoryRow[];
  role: AdminRole | null;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [users, setUsers] = useState(initialUsers);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminUserDirectoryRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [userType, setUserType] = useState<UserType>("patient");
  const [phone, setPhone] = useState("");
  const [isActive, setIsActive] = useState(true);

  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newUserType, setNewUserType] = useState<UserType>("patient");
  const [newPhone, setNewPhone] = useState("");
  const [newPasswordMode, setNewPasswordMode] = useState<"random" | "custom">("random");
  const [newCustomPassword, setNewCustomPassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);

  const [resetTarget, setResetTarget] = useState<AdminUserDirectoryRow | null>(null);
  const [resetPasswordMode, setResetPasswordMode] = useState<"random" | "custom">("random");
  const [resetCustomPassword, setResetCustomPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetCredentials, setResetCredentials] = useState<{ email: string; password: string } | null>(null);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return users;
    return users.filter(
      (u) => u.full_name?.toLowerCase().includes(term) || u.email?.toLowerCase().includes(term),
    );
  }, [users, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page_ = Math.min(page, totalPages);
  const visible = filtered.slice((page_ - 1) * PAGE_SIZE, page_ * PAGE_SIZE);

  function handleQueryChange(value: string) {
    setQuery(value);
    setPage(1);
  }

  function openEdit(u: AdminUserDirectoryRow) {
    setEditing(u);
    setFullName(u.full_name ?? "");
    setUserType(u.user_type);
    setPhone(u.phone_number ?? "");
    setIsActive(u.is_active);
    setError(null);
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName, user_type: userType, phone_number: phone || null, is_active: isActive })
      .eq("id", editing.id);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await logAdminAction(supabase, user.id, "profile_update", "profiles", editing.id, {
        full_name: fullName,
        user_type: userType,
        is_active: isActive,
      });
    }
    setUsers((prev) =>
      prev.map((u) =>
        u.id === editing.id
          ? { ...u, full_name: fullName, user_type: userType, phone_number: phone || null, is_active: isActive }
          : u,
      ),
    );
    setEditing(null);
    router.refresh();
  }

  async function toggleActive(u: AdminUserDirectoryRow) {
    const nextActive = !u.is_active;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ is_active: nextActive })
      .eq("id", u.id);
    if (updateError) return;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await logAdminAction(supabase, user.id, nextActive ? "user_activate" : "user_deactivate", "profiles", u.id);
    }
    setUsers((prev) => prev.map((row) => (row.id === u.id ? { ...row, is_active: nextActive } : row)));
    router.refresh();
  }

  function openAdd() {
    setNewEmail("");
    setNewFullName("");
    setNewUserType("patient");
    setNewPhone("");
    setNewPasswordMode("random");
    setNewCustomPassword("");
    setCreateError(null);
    setCreatedCredentials(null);
    setAddOpen(true);
  }

  async function createUser() {
    if (!newEmail.trim()) {
      setCreateError("Email is required.");
      return;
    }
    if (newPasswordMode === "custom" && newCustomPassword.length < 6) {
      setCreateError("Custom password must be at least 6 characters.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { data, error: fnError } = await supabase.functions.invoke("admin-create-user", {
      body: {
        email: newEmail.trim(),
        full_name: newFullName.trim(),
        user_type: newUserType,
        phone_number: newPhone.trim() || null,
        password: newPasswordMode === "custom" ? newCustomPassword : undefined,
      },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    setCreating(false);
    if (fnError || !data || data.error) {
      setCreateError(data?.error ?? (await extractFunctionError(fnError, "Failed to create user.")));
      return;
    }
    setCreatedCredentials({ email: data.user.email, password: data.temp_password });
    setUsers((prev) => [
      {
        id: data.user.id,
        full_name: newFullName.trim(),
        user_type: newUserType,
        phone_number: newPhone.trim() || null,
        is_active: true,
        language_code: "en",
        created_at: new Date().toISOString(),
        email: data.user.email,
        last_sign_in_at: null,
        email_confirmed_at: new Date().toISOString(),
      },
      ...prev,
    ]);
    router.refresh();
  }

  function openReset(u: AdminUserDirectoryRow) {
    setResetTarget(u);
    setResetPasswordMode("random");
    setResetCustomPassword("");
    setResetError(null);
    setResetCredentials(null);
  }

  async function resetPassword() {
    if (!resetTarget) return;
    if (resetPasswordMode === "custom" && resetCustomPassword.length < 6) {
      setResetError("Custom password must be at least 6 characters.");
      return;
    }
    setResetting(true);
    setResetError(null);
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const { data, error: fnError } = await supabase.functions.invoke("admin-reset-password", {
      body: {
        user_id: resetTarget.id,
        password: resetPasswordMode === "custom" ? resetCustomPassword : undefined,
      },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    });
    setResetting(false);
    if (fnError || !data || data.error) {
      setResetError(data?.error ?? (await extractFunctionError(fnError, "Failed to reset password.")));
      return;
    }
    // The Edge Function already writes the audit_log row (service role,
    // always succeeds) — no separate client-side log call needed here.
    setResetCredentials({ email: data.email, password: data.temp_password });
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute end-3 top-1/2 -translate-y-1/2 text-ink-500" size={16} />
          <input
            value={query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder="Search by name or email…"
            className="h-10 w-full rounded-md border border-ink-300 bg-surface-card ps-3 pe-9 text-bodys focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-300"
          />
        </div>
        <Button size="md" onClick={openAdd} className="w-auto px-4">
          <Plus size={16} /> Add user
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border border-ink-100">
        <table className="w-full text-start text-bodys">
          <thead className="bg-ink-100 text-caption font-semibold text-ink-500">
            <tr>
              <th className="px-3 py-2 text-start">Name</th>
              <th className="px-3 py-2 text-start">Email</th>
              <th className="px-3 py-2 text-start">Type</th>
              <th className="px-3 py-2 text-start">Phone</th>
              <th className="px-3 py-2 text-start">Status</th>
              <th className="px-3 py-2 text-start">Joined</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {visible.map((u) => (
              <tr key={u.id} className="border-t border-ink-100">
                <td className="px-3 py-2 font-medium text-ink-900">{u.full_name || "—"}</td>
                <td className="px-3 py-2 text-ink-700">{u.email}</td>
                <td className="px-3 py-2 capitalize text-ink-700">{u.user_type}</td>
                <td className="px-3 py-2 text-ink-700">{u.phone_number || "—"}</td>
                <td className="px-3 py-2">
                  <span
                    className={
                      u.is_active
                        ? "rounded-pill bg-success-100 px-2 py-0.5 text-caption font-medium text-success-700"
                        : "rounded-pill bg-danger-100 px-2 py-0.5 text-caption font-medium text-danger-500"
                    }
                  >
                    {u.is_active ? "Active" : "Deactivated"}
                  </span>
                </td>
                <td className="px-3 py-2 text-ink-500">{new Date(u.created_at).toLocaleDateString()}</td>
                <td className="whitespace-nowrap px-3 py-2 text-end">
                  <button
                    type="button"
                    onClick={() => openEdit(u)}
                    className="me-2 rounded-md px-2 py-1 text-primary-700 hover:bg-primary-050"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => openReset(u)}
                    className="me-2 inline-flex items-center gap-1 rounded-md px-2 py-1 text-ink-700 hover:bg-ink-100"
                    title="Reset password"
                  >
                    <KeyRound size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(u)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-ink-700 hover:bg-ink-100"
                    title={u.is_active ? "Deactivate" : "Reactivate"}
                  >
                    {u.is_active ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                  </button>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-center text-ink-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-2 text-center text-caption text-ink-500">
        {filtered.length} {filtered.length === 1 ? "user" : "users"} — page {page_} of {totalPages}
      </p>
      <Pagination page={page_} totalPages={totalPages} onChange={setPage} />

      <p className="mt-3 text-caption text-ink-500">
        Signed in as <span className="font-medium">{role}</span>. &ldquo;Deactivate&rdquo; is an in-app flag
        only — it hides the account from safety checks and caregiver views, but does not revoke Supabase Auth
        sign-in (that requires the service-role key, which isn&apos;t exposed to this dashboard).
      </p>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit user">
        {editing && (
          <div className="space-y-4">
            <TextField label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            <TextField label="Email" value={editing.email} disabled className="opacity-60" />
            <div>
              <span className="mb-1.5 block text-bodym font-semibold text-ink-900">User type</span>
              <div className="flex gap-2">
                {USER_TYPES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setUserType(v)}
                    className={
                      userType === v
                        ? "rounded-pill bg-primary-900 px-3 py-1.5 text-bodys font-semibold text-white"
                        : "rounded-pill border border-ink-300 px-3 py-1.5 text-bodys text-ink-700"
                    }
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <TextField label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} />
            <label className="flex items-center gap-2 text-bodym text-ink-900">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
              Active
            </label>

            {error && <p className="text-bodys text-danger-500">{error}</p>}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setEditing(null)} size="md">
                Cancel
              </Button>
              <Button onClick={save} disabled={saving} size="md">
                {saving ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add user"
      >
        {createdCredentials ? (
          <div className="space-y-4">
            <p className="text-bodys text-ink-700">
              Account created. Share this temporary password with the user directly — it won&apos;t be shown
              again. They should change it after signing in.
            </p>
            <div className="rounded-md border border-ink-100 bg-ink-100 p-3">
              <p className="text-caption text-ink-500">Email</p>
              <p className="mb-2 font-mono text-bodys text-ink-900">{createdCredentials.email}</p>
              <p className="text-caption text-ink-500">Temporary password</p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-bodys text-ink-900">{createdCredentials.password}</p>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(createdCredentials.password)}
                  className="rounded-md p-1 text-primary-700 hover:bg-primary-050"
                  title="Copy password"
                >
                  <Copy size={14} />
                </button>
              </div>
            </div>
            <Button size="md" onClick={() => setAddOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <TextField label="Email" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
            <TextField label="Full name" value={newFullName} onChange={(e) => setNewFullName(e.target.value)} />
            <div>
              <span className="mb-1.5 block text-bodym font-semibold text-ink-900">User type</span>
              <div className="flex gap-2">
                {USER_TYPES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setNewUserType(v)}
                    className={
                      newUserType === v
                        ? "rounded-pill bg-primary-900 px-3 py-1.5 text-bodys font-semibold text-white"
                        : "rounded-pill border border-ink-300 px-3 py-1.5 text-bodys text-ink-700"
                    }
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            <TextField label="Phone number (optional)" value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />

            <div>
              <span className="mb-1.5 block text-bodym font-semibold text-ink-900">Password</span>
              <div className="mb-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setNewPasswordMode("random")}
                  className={
                    newPasswordMode === "random"
                      ? "rounded-pill bg-primary-900 px-3 py-1.5 text-bodys font-semibold text-white"
                      : "rounded-pill border border-ink-300 px-3 py-1.5 text-bodys text-ink-700"
                  }
                >
                  Generate randomly
                </button>
                <button
                  type="button"
                  onClick={() => setNewPasswordMode("custom")}
                  className={
                    newPasswordMode === "custom"
                      ? "rounded-pill bg-primary-900 px-3 py-1.5 text-bodys font-semibold text-white"
                      : "rounded-pill border border-ink-300 px-3 py-1.5 text-bodys text-ink-700"
                  }
                >
                  Set manually
                </button>
              </div>
              {newPasswordMode === "custom" && (
                <TextField
                  placeholder="At least 6 characters"
                  value={newCustomPassword}
                  onChange={(e) => setNewCustomPassword(e.target.value)}
                />
              )}
            </div>

            {createError && <p className="text-bodys text-danger-500">{createError}</p>}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)} size="md">
                Cancel
              </Button>
              <Button onClick={createUser} disabled={creating} size="md">
                {creating ? "Creating…" : "Create"}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!resetTarget} onClose={() => setResetTarget(null)} title="Reset password">
        {resetTarget && (
          <div className="space-y-4">
            {resetCredentials ? (
              <>
                <p className="text-bodys text-ink-700">
                  Password updated. Share it with the user directly — it won&apos;t be shown again.
                </p>
                <div className="rounded-md border border-ink-100 bg-ink-100 p-3">
                  <p className="text-caption text-ink-500">Email</p>
                  <p className="mb-2 font-mono text-bodys text-ink-900">{resetCredentials.email}</p>
                  <p className="text-caption text-ink-500">New password</p>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-bodys text-ink-900">{resetCredentials.password}</p>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(resetCredentials.password)}
                      className="rounded-md p-1 text-primary-700 hover:bg-primary-050"
                      title="Copy password"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
                <Button size="md" onClick={() => setResetTarget(null)}>
                  Done
                </Button>
              </>
            ) : (
              <>
                <p className="text-bodys text-ink-700">
                  This immediately replaces <span className="font-medium">{resetTarget.email}</span>&apos;s
                  password. Their current password stops working right away.
                </p>

                <div>
                  <span className="mb-1.5 block text-bodym font-semibold text-ink-900">New password</span>
                  <div className="mb-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setResetPasswordMode("random")}
                      className={
                        resetPasswordMode === "random"
                          ? "rounded-pill bg-primary-900 px-3 py-1.5 text-bodys font-semibold text-white"
                          : "rounded-pill border border-ink-300 px-3 py-1.5 text-bodys text-ink-700"
                      }
                    >
                      Generate randomly
                    </button>
                    <button
                      type="button"
                      onClick={() => setResetPasswordMode("custom")}
                      className={
                        resetPasswordMode === "custom"
                          ? "rounded-pill bg-primary-900 px-3 py-1.5 text-bodys font-semibold text-white"
                          : "rounded-pill border border-ink-300 px-3 py-1.5 text-bodys text-ink-700"
                      }
                    >
                      Set manually
                    </button>
                  </div>
                  {resetPasswordMode === "custom" && (
                    <TextField
                      placeholder="At least 6 characters"
                      value={resetCustomPassword}
                      onChange={(e) => setResetCustomPassword(e.target.value)}
                    />
                  )}
                </div>

                {resetError && <p className="text-bodys text-danger-500">{resetError}</p>}
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setResetTarget(null)} size="md">
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={resetPassword} disabled={resetting} size="md">
                    {resetting ? "Resetting…" : "Reset password"}
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
