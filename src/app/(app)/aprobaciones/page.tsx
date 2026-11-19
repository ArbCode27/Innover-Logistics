import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/actions/auth";
import { getPendingApprovals } from "@/actions/approvals";
import { ApprovalsInboxView } from "@/components/features/approvals/approvals-inbox-view";

export default async function ApprovalsPage() {
  const profile = await getCurrentProfile();

  if (profile?.role !== "superadmin") {
    redirect("/inventario");
  }

  const documents = await getPendingApprovals();

  return (
    <ApprovalsInboxView documents={documents} currentUserId={profile.id} />
  );
}
