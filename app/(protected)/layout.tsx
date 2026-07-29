import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifySessionToken } from "@/lib/session";
import { Nav } from "@/components/Nav";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { env } = await getCloudflareContext({ async: true });
  const cookieStore = await cookies();
  const token = cookieStore.get("session")?.value;

  const valid = await verifySessionToken(token, env.SESSION_SECRET);
  if (!valid) {
    redirect("/login");
  }

  return (
    <>
      <Nav />
      {children}
    </>
  );
}
