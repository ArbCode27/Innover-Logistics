import { getCurrentProfile } from "@/actions/auth";
import { getLocations, getItemsCatalog } from "@/actions/inventory";
import { getCrewStock } from "@/actions/crews";
import { CrewsManagementView } from "@/components/features/crews/crews-management-view";

export default async function CrewsPage() {
  const profile = await getCurrentProfile();
  const [locations, items] = await Promise.all([
    getLocations(profile?.branch_id || undefined),
    getItemsCatalog(),
  ]);

  const crews = locations.filter((l) => l.type === "crew");
  const warehouses = locations.filter((l) => l.type === "branch");

  const initialCrewStock = await getCrewStock(
    crews[0]?.id || "l0000000-0000-0000-0000-000000000010"
  );

  return (
    <CrewsManagementView
      crews={crews}
      warehouses={warehouses}
      items={items}
      initialCrewStock={initialCrewStock}
      userRole={profile?.role || "tecnico"}
    />
  );
}
