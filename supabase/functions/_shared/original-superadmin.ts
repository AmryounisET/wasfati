// The one account allowed to grant or revoke superadmin status (see
// admin-set-role), and which no other superadmin is allowed to delete (see
// admin-delete-user) — without this, a promoted superadmin could delete
// the original account and nobody could ever grant the role again.
export const ORIGINAL_SUPERADMIN_EMAIL = "amrsamyounis@gmail.com";
