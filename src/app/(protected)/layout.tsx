import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import TopNav from "@/components/TopNav";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  const role = (session.user as { role?: string }).role ?? "VIEWER";
  const name = session.user.name ?? session.user.email ?? "User";

  return (
    <div className="min-h-screen flex flex-col">
      <TopNav role={role} name={name} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
