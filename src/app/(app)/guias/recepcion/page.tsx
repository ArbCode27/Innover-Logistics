import { getCurrentProfile } from "@/actions/auth";
import { getTransfersList } from "@/actions/transfers";
import { TransfersReceptionView } from "@/components/features/transfers/transfers-reception-view";

export default async function TransfersReceptionPage() {
  const profile = await getCurrentProfile();
  const transfers = await getTransfersList();

  return (
    <TransfersReceptionView
      transfers={transfers}
      userRole={profile?.role || "tecnico"}
      userBranchId={profile?.branch_id || null}
    />
  );
}
