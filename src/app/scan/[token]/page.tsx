import { notFound } from "next/navigation";
import { getScanSessionByToken } from "@/actions/scan";
import { MobileScannerView } from "@/components/features/scan/mobile-scanner-view";
import { AlertCircle, QrCode } from "lucide-react";

interface ScanPageProps {
  params: Promise<{ token: string }>;
}

export default async function MobileScanPage({ params }: ScanPageProps) {
  const { token } = await params;
  const { session, location, profile } = await getScanSessionByToken(token);

  if (!session) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-zinc-900 border border-zinc-800 p-8 rounded-2xl max-w-sm w-full space-y-4">
          <div className="h-14 w-14 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold">Sesión Expirada o Inválida</h1>
          <p className="text-sm text-zinc-400">
            El enlace de vinculación ya no está disponible o ha caducado.
          </p>
          <div className="pt-2 text-xs text-zinc-500 flex items-center justify-center gap-1.5">
            <QrCode className="h-4 w-4" />
            <span>Escanee nuevamente el QR desde la pantalla de la PC</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <MobileScannerView
      token={token}
      initialSession={session}
      locationName={location?.name}
      userName={profile?.full_name}
    />
  );
}
