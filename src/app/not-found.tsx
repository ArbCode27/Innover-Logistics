import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <h2 className="text-2xl font-bold tracking-tight">Página no encontrada</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        La página no existe o cambió de lugar.
      </p>
      <Button asChild className="mt-6">
        <Link href="/inventario">Volver al inventario</Link>
      </Button>
    </div>
  );
}
