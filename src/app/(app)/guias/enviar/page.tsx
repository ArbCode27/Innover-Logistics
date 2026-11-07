import { getCurrentProfile } from "@/actions/auth";
import { getLocations, getItemsCatalog } from "@/actions/inventory";
import { IssueTransferForm } from "@/components/features/transfers/issue-transfer-form";

export default async function IssueTransferPage() {
  const profile = await getCurrentProfile();
  const locations = await getLocations();
  const items = await getItemsCatalog();

  const userWarehouse = locations.find(
    (l) => l.branch_id === profile?.branch_id && l.type === "branch"
  );

  return (
    <IssueTransferForm
      locations={locations}
      items={items}
      defaultOriginLocationId={userWarehouse?.id}
    />
  );
}
