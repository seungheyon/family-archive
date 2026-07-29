import { getCloudflareContext } from "@opennextjs/cloudflare";
import { createSessionToken } from "@/lib/session";

const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30일

export async function POST(request: Request) {
  const { env } = await getCloudflareContext({ async: true });
  const formData = await request.formData();
  const password = formData.get("password");

  const role =
    typeof password === "string" && password === env.ADMIN_PASSWORD
      ? "admin"
      : typeof password === "string" && password === env.SITE_PASSWORD
        ? "family"
        : null;

  if (!role) {
    return new Response(null, {
      status: 302,
      headers: { Location: "/login?error=1" },
    });
  }

  const token = await createSessionToken(env.SESSION_SECRET, role);

  return new Response(null, {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie": `session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`,
    },
  });
}
