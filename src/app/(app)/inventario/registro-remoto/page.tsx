import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/actions/auth";
import { getItemsCatalog, getLocations } from "@/actions/inventory";
import { createOrGetActiveScanSession } from "@/actions/scan";
import { RemoteScanView } from "@/components/features/inventory/remote-scan-view";

export const metadata = {
  title: "Registro Remoto de Inventario | Star Conectados",
  description: "Vinculación de cámara móvil y lectura óptica de seriales y equipos",
};

export default async function RegistroRemotoPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  const { session, baseUrl } = await createOrGetActiveScanSession();
  const items = await getItemsCatalog();
  const locations = await getLocations(profile.branch_id || undefined);

  const defaultLocationId =
    profile.crew_id ||
    locations[0]?.id ||
    "l0000000-0000-0000-0000-000000000001";

  return (
    <RemoteScanView
      initialSession={session}
      baseUrl={baseUrl}
      items={items}
      locations={locations}
      userRole={profile.role}
      defaultLocationId={defaultLocationId}
      userName={profile.full_name}
    />
  );
}
