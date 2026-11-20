import { getCurrentProfile } from "@/actions/auth";
import { getLocations, getItemsCatalog, getSerializedUnits } from "@/actions/inventory";
import { getDispatchOrdersHistory } from "@/actions/dispatch-orders";
import { getTechnicians } from "@/actions/technicians";
import { DispatchOrdersView } from "@/components/features/consumptions/dispatch-orders-view";

export default async function ConsumptionsPage() {
  const profile = await getCurrentProfile();
  const locations = await getLocations(profile?.branch_id || undefined);
  const serialLocationId = profile?.crew_id || locations[0]?.id;
  const [items, historyDocuments, serializedUnits, technicians] = await Promise.all([
    getItemsCatalog(),
    getDispatchOrdersHistory(
      profile?.branch_id || undefined,
      profile?.crew_id || undefined
    ),
    serialLocationId ? getSerializedUnits(serialLocationId) : Promise.resolve([]),
    getTechnicians({
      branchId: profile?.role === "superadmin" ? undefined : profile?.branch_id || undefined,
      activeOnly: true,
    }),
  ]);

  return (
    <DispatchOrdersView
      locations={locations}
      items={items}
      historyDocuments={historyDocuments}
      technicians={technicians}
      userRole={profile?.role || "tecnico"}
      defaultLocationId={profile?.crew_id || undefined}
      serializedUnits={serializedUnits}
    />
  );
}
