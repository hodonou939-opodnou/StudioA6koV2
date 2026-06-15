import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

// Server-side gate: the entire /admin area is invisible to the public.
// Anonymous users and non-admins are redirected to the app home before any
// admin UI is sent to the browser.
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || session.user.role !== "admin") {
    redirect("/");
  }
  return <>{children}</>;
}
