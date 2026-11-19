import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/actions/auth";
import { AppFrame } from "@/components/shared/app-frame";

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
    <AppFrame profile={profile} branchName={branchName}>
      {children}
    </AppFrame>
  );
}
