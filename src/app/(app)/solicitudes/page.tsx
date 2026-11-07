import { getCurrentProfile } from "@/actions/auth";
import { getLocations, getItemsCatalog } from "@/actions/inventory";
import { getRequestsList } from "@/actions/requests";
import { RequestsManagementView } from "@/components/features/requests/requests-management-view";

export default async function RequestsPage() {
  const profile = await getCurrentProfile();
  const requests = await getRequestsList(profile?.branch_id || undefined);
  const items = await getItemsCatalog();
  const locations = await getLocations(profile?.branch_id || undefined);

  const crews = locations.filter((l) => l.type === "crew");

  return (
    <RequestsManagementView
      requests={requests}
      items={items}
      crews={crews.length > 0 ? crews : locations}
      userRole={profile?.role || "tecnico"}
      userBranchId={
        profile?.branch_id || "b0000000-0000-0000-0000-000000000001"
      }
      userCrewId={profile?.crew_id || undefined}
    />
  );
}
