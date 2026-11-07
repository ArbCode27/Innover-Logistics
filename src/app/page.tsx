import Link from "next/link";
import { ArrowRight, Boxes, ShieldCheck, Truck, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/40 p-6 md:p-12 flex flex-col items-center justify-center">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2">
            <Badge variant="info" className="px-3 py-1 text-sm font-medium">
              Tv Star Satellite, C.A. • Desarrollado por Innover
            </Badge>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground">
            Star Conectados
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Plataforma centralizada de control de stock por sucursal y cuadrilla,
            transferencias intersedes, compras y consumos en campo con trazabilidad inmutable.
          </p>
          <div className="pt-2">
            <Button asChild size="lg" className="gap-2 shadow-md">
              <Link href="/login">
                Acceder al Sistema <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-6">
          <Card className="border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-primary flex items-center justify-center mb-2">
                <Boxes className="h-5 w-5" aria-hidden="true" />
              </div>
              <CardTitle className="text-base">Ledger Inmutable</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <CardDescription className="text-xs">
                El stock es el resultado estricto de movimientos contables auditable por triggers.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                <Truck className="h-5 w-5" aria-hidden="true" />
              </div>
              <CardTitle className="text-base">Guías de Traslado</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <CardDescription className="text-xs">
                Descuento en tránsito y acreditación en destino mediante recepción atómica RPC.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-2">
                <Users className="h-5 w-5" aria-hidden="true" />
              </div>
              <CardTitle className="text-base">Consumo en Campo</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <CardDescription className="text-xs">
                Registro ultra-rápido en menos de 30 segundos con vinculación obligatoria de OT / Ticket.
              </CardDescription>
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader className="p-5 pb-2">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2">
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              </div>
              <CardTitle className="text-base">RLS y Trazabilidad</CardTitle>
            </CardHeader>
            <CardContent className="p-5 pt-0">
              <CardDescription className="text-xs">
                Aislamiento estricto por sucursal y registro de eventos en audit_log en base de datos.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
