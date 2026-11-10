import { getCurrentProfile } from "@/actions/auth";
import { getLocations, getItemsCatalog, getSerializedUnits } from "@/actions/inventory";
import { getConsumptionsList } from "@/actions/consumptions";
import { FieldConsumptionForm } from "@/components/features/consumptions/field-consumption-form";

export default async function ConsumptionsPage() {
  const profile = await getCurrentProfile();
  const [locations, items, consumptions, serializedUnits] = await Promise.all([
    getLocations(profile?.branch_id || undefined),
    getItemsCatalog(),
    getConsumptionsList(
      profile?.branch_id || undefined,
      profile?.crew_id || undefined
    ),
    getSerializedUnits(),
  ]);

  const crewLocations = locations.filter((l) => l.type === "crew");

  return (
    <FieldConsumptionForm
      crews={crewLocations.length > 0 ? crewLocations : locations}
      items={items}
      consumptions={consumptions}
      userRole={profile?.role || "tecnico"}
      defaultCrewId={profile?.crew_id || undefined}
      serializedUnits={serializedUnits}
    />
  );
}
