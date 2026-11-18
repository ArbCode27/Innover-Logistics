"use client";

import * as React from "react";
import {
  Building2,
  Calendar,
  CheckCircle2,
  FileText,
  Hash,
  Loader2,
  MapPin,
  Printer,
  ShieldCheck,
  User,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { getDocumentVoucherDetails } from "@/actions/history";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatNumber } from "@/lib/utils";
import type { DocumentWithDetails } from "@/types/inventory";

interface DocumentVoucherModalProps {
  documentId: string | null;
  docNumber: string | null;
  onClose: () => void;
}

export const DocumentVoucherModal: React.FC<DocumentVoucherModalProps> = ({
  documentId,
  docNumber,
  onClose,
}) => {
  const [doc, setDoc] = React.useState<DocumentWithDetails | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (!documentId) {
      setDoc(null);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    getDocumentVoucherDetails(documentId)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setDoc(data);
        } else {
          // Fallback mínimo con los datos pasados
          setDoc({
            id: documentId,
            document_number: docNumber || "DOC-S/N",
            document_type: "transfer",
            branch_id: "",
            origin_location_id: null,
            destination_location_id: null,
            status: "APPROVED",
            ticket_ref: null,
            reason: null,
            notes: null,
            created_by: "",
            approved_by: null,
            approved_at: null,
            cancelled_by: null,
            cancelled_at: null,
            cancellation_reason: null,
            related_document_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            branch: {
              id: "",
              code: "STAR",
              name: "Tv Star Satellite, C.A.",
              address: "Av. Principal Torre Star",
              phone: "+58 212 555 0000",
              is_active: true,
              created_at: "",
              updated_at: "",
            },
            creator: {
              id: "",
              email: "admin@star.com",
              full_name: "Administrador Star",
              phone: null,
              role: "superadmin",
              branch_id: null,
              crew_id: null,
              is_active: true,
              created_at: "",
              updated_at: "",
            },
            lines: [],
          });
        }
      })
      .catch(() => {
        if (isMounted) toast.error("Error al cargar detalles del comprobante");
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [documentId, docNumber]);

  const handlePrint = (): void => {
    window.print();
  };

  const getDocTypeLabel = (type: string) => {
    switch (type) {
      case "purchase":
        return "COMPROBANTE DE COMPRA LOCAL / ENTRADA";
      case "transfer":
        return "GUÍA DE MOVIMIENTO Y TRASLADO ENTRE ALMACENES";
      case "assignment":
        return "ACTA DE ASIGNACIÓN A CUADRILLA TÉCNICA";
      case "consumption":
        return "ORDEN DE SALIDA Y DESPACHO DE MATERIAL (AVERÍA/INSTALACIÓN)";
      default:
        return "COMPROBANTE OFICIAL DE MOVIMIENTO";
    }
  };

  return (
    <Dialog open={Boolean(documentId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 print:m-0 print:p-0 print:max-w-none print:shadow-none print:border-none">
        <DialogHeader className="print:hidden pb-2 border-b flex flex-row items-center justify-between">
          <DialogTitle className="flex items-center gap-2 text-primary text-base">
            <FileText className="h-5 w-5" />
            Comprobante Oficial de Movimiento
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={handlePrint}
              className="gap-1.5 bg-primary font-semibold min-h-[38px]"
            >
              <Printer className="h-4 w-4" />
              Imprimir / PDF
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm">Cargando datos oficiales del documento...</p>
          </div>
        ) : !doc ? (
          <div className="text-center py-10 text-muted-foreground">
            No se pudo cargar la información del documento.
          </div>
        ) : (
          <div className="space-y-6 text-foreground print:text-black print:space-y-4 print:text-xs">
            {/* Encabezado Oficial Fiscal de la Empresa */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border print:border-black">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-primary print:text-black">
                    STAR CONECTADOS
                  </span>
                  <Badge variant="outline" className="font-mono text-xs">
                    CONATEL Habilitado
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground print:text-gray-700 font-medium">
                  Tv Star Satellite, C.A. • RIF: J-30117715-0
                </div>
                <div className="text-xs text-muted-foreground print:text-gray-700">
                  Proveedor de Telecomunicaciones y Servicios de Internet
                </div>
              </div>

              <div className="text-left sm:text-right space-y-1 bg-muted/40 print:bg-transparent p-3 rounded-lg border print:border-black">
                <div className="text-xs uppercase font-bold text-muted-foreground print:text-black">
                  N° Comprobante Oficial
                </div>
                <div className="font-mono font-extrabold text-lg text-primary print:text-black">
                  {doc.document_number}
                </div>
                <div className="text-xs text-muted-foreground print:text-gray-700 flex items-center sm:justify-end gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(doc.created_at)}
                </div>
              </div>
            </div>

            {/* Título del Tipo de Movimiento */}
            <div className="text-center py-1 bg-muted/30 print:bg-gray-100 rounded border font-bold text-xs uppercase tracking-wider">
              {getDocTypeLabel(doc.document_type)}
            </div>

            {/* Metadatos de Origen, Destino y Responsables */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 rounded-lg border bg-card print:border-black space-y-1.5">
                <div className="font-bold uppercase tracking-wider text-muted-foreground print:text-black flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary print:text-black" />
                  Origen / Emisor
                </div>
                <div>
                  <strong>Sede:</strong> {doc.branch?.name || "Sede Central"} ({doc.branch?.code || "MATRIZ"})
                </div>
                <div>
                  <strong>Almacén Emisor:</strong> {doc.origin_location?.name || "Almacén Principal"}
                </div>
                <div>
                  <strong>Emitido por:</strong> {doc.creator?.full_name || "Personal Autorizado"}
                </div>
                {doc.supplier_name && (
                  <div className="pt-1 text-primary print:text-black font-semibold">
                    <strong>Proveedor:</strong> {doc.supplier_name} {doc.supplier_rif ? `(${doc.supplier_rif})` : ""}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-lg border bg-card print:border-black space-y-1.5">
                <div className="font-bold uppercase tracking-wider text-muted-foreground print:text-black flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-primary print:text-black" />
                  Destino / Receptor
                </div>
                <div>
                  <strong>Ubicación Destino:</strong> {doc.destination_location?.name || doc.origin_location?.name || "Custodia de Almacén"}
                </div>
                {doc.ticket_ref && (
                  <div>
                    <strong>N° Ticket / Avería:</strong> {doc.ticket_ref}
                  </div>
                )}
                {doc.invoice_number && (
                  <div>
                    <strong>N° Factura Proveedor:</strong> {doc.invoice_number}
                  </div>
                )}
                {doc.delivery_note_number && (
                  <div>
                    <strong>Nota de Entrega N°:</strong> {doc.delivery_note_number}
                  </div>
                )}
                <div>
                  <strong>Estado:</strong>{" "}
                  <span className="font-bold uppercase text-emerald-600 print:text-black">
                    {doc.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabla Detallada de Materiales */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground print:text-black">
                Detalle de Materiales y Equipos
              </div>
              <div className="rounded-lg border overflow-hidden print:border-black">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 print:bg-gray-100 border-b print:border-black">
                    <tr>
                      <th className="p-2.5 font-bold">SKU</th>
                      <th className="p-2.5 font-bold">Descripción del Material</th>
                      <th className="p-2.5 text-right font-bold">Cantidad</th>
                      <th className="p-2.5 font-bold">Unidad</th>
                      <th className="p-2.5 font-bold">Serial / MAC</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y print:divide-black">
                    {doc.lines && doc.lines.length > 0 ? (
                      doc.lines.map((line, idx) => (
                        <tr key={line.id || idx} className="hover:bg-muted/20">
                          <td className="p-2.5 font-mono font-semibold">{line.item?.sku || "SKU"}</td>
                          <td className="p-2.5 font-medium">{line.item?.name || "Material"}</td>
                          <td className="p-2.5 text-right font-mono font-bold text-sm">
                            {formatNumber(Number(line.quantity), 0)}
                          </td>
                          <td className="p-2.5">{line.item?.unit || "unidades"}</td>
                          <td className="p-2.5 font-mono text-[11px]">
                            {line.serial_unit ? (
                              <span>
                                S/N: {line.serial_unit.serial_number}
                                {line.serial_unit.mac_address ? ` • MAC: ${line.serial_unit.mac_address}` : ""}
                              </span>
                            ) : (
                              <span className="text-muted-foreground print:text-gray-500">N/A</span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="p-4 text-center text-muted-foreground">
                          Movimiento registrado en Ledger General.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Observaciones y Motivo */}
            {(doc.notes || doc.reason) && (
              <div className="p-3 rounded-lg border bg-muted/20 print:border-black text-xs space-y-1">
                <strong>Motivo / Observaciones:</strong>
                <p className="text-muted-foreground print:text-black">
                  {doc.notes || doc.reason}
                </p>
              </div>
            )}

            {/* Cuadro de Firmas Legales y Recepción Conforme */}
            <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
              <div className="space-y-12">
                <div className="border-t border-dashed border-foreground/60 print:border-black pt-2">
                  <p className="font-bold">DESPACHADO / ENTREGADO POR</p>
                  <p className="text-muted-foreground print:text-gray-700">Firma y C.I. del Emisor</p>
                  <p className="text-[10px] text-muted-foreground">{doc.creator?.full_name}</p>
                </div>
              </div>

              <div className="space-y-12">
                <div className="border-t border-dashed border-foreground/60 print:border-black pt-2">
                  <p className="font-bold">RECIBIDO CONFORME</p>
                  <p className="text-muted-foreground print:text-gray-700">Firma, C.I. y Sello Receptor</p>
                  <p className="text-[10px] text-muted-foreground">
                    {doc.technician_name || "Responsable de Destino"}
                  </p>
                </div>
              </div>
            </div>

            {/* Pie de página con cláusula de seguridad */}
            <div className="pt-4 border-t text-[10px] text-center text-muted-foreground print:text-gray-600 space-y-0.5">
              <p>Este documento es un comprobante oficial de trazabilidad de Tv Star Satellite, C.A.</p>
              <p>Los materiales amparados en esta guía son propiedad exclusiva de la empresa para operaciones de red.</p>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
