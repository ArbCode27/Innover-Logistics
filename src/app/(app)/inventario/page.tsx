import { getCurrentProfile } from "@/actions/auth";
import {
  getInventoryStock,
  getLocations,
  getSerializedUnits,
} from "@/actions/inventory";
import { InventoryView } from "@/components/features/inventory/inventory-view";

export default async function InventoryPage() {
  const profile = await getCurrentProfile();
  const [initialStock, locations, serializedUnits] = await Promise.all([
    getInventoryStock(),
    getLocations(profile?.branch_id || undefined),
    getSerializedUnits(),
  ]);

  return (
    <InventoryView
      initialStock={initialStock}
      locations={locations}
      serializedUnits={serializedUnits}
      userRole={profile?.role || "tecnico"}
      currentLocationId={
        profile?.crew_id ||
        locations[0]?.id ||
        "l0000000-0000-0000-0000-000000000001"
      }
    />
  );
}
