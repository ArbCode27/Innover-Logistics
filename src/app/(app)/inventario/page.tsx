import { Suspense } from "react";
import { getCurrentProfile } from "@/actions/auth";
import {
  getBranches,
  getInventoryStock,
  getItemsCatalog,
  getLocations,
  getSerializedUnits,
} from "@/actions/inventory";
import { InventoryTableSkeleton } from "@/components/features/inventory/design-system/inventory-skeleton";
import { InventoryView } from "@/components/features/inventory/inventory-view";

interface InventoryPageProps {
  searchParams: Promise<{ buscar?: string }>;
}

const InventoryPageContent = async ({ searchParams }: InventoryPageProps) => {
  const params = await searchParams;
  const profilePromise = getCurrentProfile();
  const branchesPromise = getBranches();
  const catalogPromise = getItemsCatalog();
  const profile = await profilePromise;
  const locations = await getLocations(profile?.branch_id || undefined);
  const currentLocationId =
    profile?.crew_id ||
    locations[0]?.id ||
    "l0000000-0000-0000-0000-000000000001";

  const [initialStock, serializedUnits] = await Promise.all([
    getInventoryStock(currentLocationId),
    getSerializedUnits(currentLocationId),
    branchesPromise,
    catalogPromise,
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
};

export default function InventoryPage({ searchParams }: InventoryPageProps) {
  return (
    <Suspense fallback={<InventoryTableSkeleton />}>
      <InventoryPageContent searchParams={searchParams} />
    </Suspense>
  );
}
