import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/actions/auth";
import { getBranches } from "@/actions/inventory";
import { getTechnicians } from "@/actions/technicians";
import { TechniciansManagementView } from "@/components/features/technicians/technicians-management-view";

export default async function TechniciansPage() {
  const profile = await getCurrentProfile();

  if (!profile || !["superadmin", "admin_sucursal"].includes(profile.role)) {
    redirect("/inventario");
  }

  const branchFilter = profile.role === "admin_sucursal" ? profile.branch_id || undefined : undefined;
  const [technicians, branches] = await Promise.all([
    getTechnicians({ branchId: branchFilter || undefined }),
    getBranches(),
  ]);

  const visibleBranches =
    profile.role === "admin_sucursal" && profile.branch_id
      ? branches.filter((branch) => branch.id === profile.branch_id)
      : branches;

  return (
    <TechniciansManagementView
      technicians={technicians}
      branches={visibleBranches}
      userRole={profile.role}
      userBranchId={profile.branch_id}
    />
  );
}
