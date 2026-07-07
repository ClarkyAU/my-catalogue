import { getUser } from "@netlify/identity";

export type AdminGate =
  | { ok: true; email: string }
  | { ok: false; response: Response };

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

/**
 * Gate an admin request. A caller must (1) be a signed-in Netlify Identity user
 * — Google SSO or otherwise — and (2) have their email listed in the
 * `ADMIN_EMAILS` environment variable (comma-separated).
 *
 * This fails closed: if `ADMIN_EMAILS` is not set, nobody is allowed, so the
 * panel stays locked down even if Identity signups are left open. The owner
 * unlocks access by adding their Google email to `ADMIN_EMAILS`.
 */
export async function requireAdmin(): Promise<AdminGate> {
  const user = await getUser();
  if (!user || !user.email) {
    return { ok: false, response: json({ error: "Unauthorized" }, 401) };
  }

  const allowlist = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  if (allowlist.length === 0) {
    return {
      ok: false,
      response: json(
        { error: "Admin access is not configured. Set the ADMIN_EMAILS environment variable to your email address." },
        403,
      ),
    };
  }

  if (!allowlist.includes(user.email.toLowerCase())) {
    return {
      ok: false,
      response: json({ error: `${user.email} is not on the admin allowlist.` }, 403),
    };
  }

  return { ok: true, email: user.email };
}
