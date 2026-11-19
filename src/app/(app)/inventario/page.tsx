import { getCurrentProfile } from "@/actions/auth";
import {
  getInventoryStock,
  getLocations,
  getSerializedUnits,
} from "@/actions/inventory";
import { InventoryView } from "@/components/features/inventory/inventory-view";

interface InventoryPageProps {
  searchParams: Promise<{ buscar?: string }>;
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const params = await searchParams;
  const profile = await getCurrentProfile();
  const locations = await getLocations(profile?.branch_id || undefined);
  const currentLocationId =
    profile?.crew_id ||
    locations[0]?.id ||
    "l0000000-0000-0000-0000-000000000001";

  const [initialStock, serializedUnits] = await Promise.all([
    getInventoryStock(currentLocationId),
    getSerializedUnits(),
  ]);

  return (
    <InventoryView
      initialStock={initialStock}
      locations={locations}
      serializedUnits={serializedUnits}
      userRole={profile?.role || "tecnico"}
      currentLocationId={currentLocationId}
      initialQuery={params.buscar || ""}
    />
  );
}
