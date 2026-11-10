import { getCurrentProfile } from "@/actions/auth";
import { getMovementsLedger } from "@/actions/history";
import { HistoryLedgerView } from "@/components/features/history/history-ledger-view";

export default async function HistoryPage() {
  const [profile, movements] = await Promise.all([
    getCurrentProfile(),
    getMovementsLedger(),
  ]);

  return (
    <HistoryLedgerView
      initialMovements={movements}
      userRole={profile?.role || "tecnico"}
    />
  );
}
