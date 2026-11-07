import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/actions/auth";
import { AppNavbar } from "@/components/shared/app-navbar";
import { AppSidebar } from "@/components/shared/app-sidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/login");
  }

  const branchName =
    profile.branch_id === "b0000000-0000-0000-0000-000000000001"
      ? "Sede Central Caracas"
      : profile.branch_id === "b0000000-0000-0000-0000-000000000002"
      ? "Sucursal Maracaibo"
      : profile.branch_id === "b0000000-0000-0000-0000-000000000003"
      ? "Sucursal Valencia"
      : "Sucursal Activa";

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AppNavbar profile={profile} branchName={branchName} />
      <div className="flex flex-1">
        <AppSidebar role={profile.role} />
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}
