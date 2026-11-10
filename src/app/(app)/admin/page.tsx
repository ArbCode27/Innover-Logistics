import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/actions/auth";
import { getBranches, getItemsCatalog } from "@/actions/inventory";
import { AdminManagementView } from "@/components/features/admin/admin-management-view";

export default async function AdminPage() {
  const profile = await getCurrentProfile();

  if (profile?.role !== "superadmin") {
    redirect("/inventario");
  }

  const [branches, items] = await Promise.all([
    getBranches(),
    getItemsCatalog(),
  ]);

  return <AdminManagementView branches={branches} items={items} />;
}
