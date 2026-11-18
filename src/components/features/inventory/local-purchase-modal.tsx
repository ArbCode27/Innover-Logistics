"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Building2, FileText, Loader2, Plus, ShoppingCart, Tag } from "lucide-react";
import { toast } from "sonner";

import { registerLocalPurchaseAction } from "@/actions/inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Location, StockItemWithBalance } from "@/types/inventory";

interface LocalPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locations: Location[];
  currentLocationId: string;
  catalogItems: StockItemWithBalance[];
}

export const LocalPurchaseModal: React.FC<LocalPurchaseModalProps> = ({
  open,
  onOpenChange,
  locations,
  currentLocationId,
  catalogItems,
}) => {
  const router = useRouter();

  const [selectedLocation, setSelectedLocation] = React.useState<string>(currentLocationId);
  const [selectedItemId, setSelectedItemId] = React.useState<string>("");
  const [quantity, setQuantity] = React.useState<number>(1);
  const [supplierName, setSupplierName] = React.useState<string>("");
  const [supplierRif, setSupplierRif] = React.useState<string>("");
  const [invoiceNumber, setInvoiceNumber] = React.useState<string>("");
  const [serialNumber, setSerialNumber] = React.useState<string>("");
  const [macAddress, setMacAddress] = React.useState<string>("");
  const [notes, setNotes] = React.useState<string>("");
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);

  React.useEffect(() => {
    if (currentLocationId) {
      setSelectedLocation(currentLocationId);
    }
  }, [currentLocationId]);

  const selectedItem = React.useMemo(() => {
    return catalogItems.find((i) => i.id === selectedItemId);
  }, [catalogItems, selectedItemId]);

  const isSerialized = selectedItem?.is_serialized ?? false;

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    if (!selectedItemId) {
      toast.error("Debe seleccionar un material o equipo del catálogo");
      return;
    }

    if (!supplierName.trim()) {
      toast.error("El nombre del proveedor local es obligatorio");
      return;
    }

    if (quantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }

    if (isSerialized && !serialNumber.trim()) {
      toast.error("Para equipos serializados, el Serial es obligatorio");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await registerLocalPurchaseAction({
        location_id: selectedLocation || currentLocationId,
        item_id: selectedItemId,
        quantity: isSerialized ? 1 : Number(quantity),
        supplier_name: supplierName.trim(),
        supplier_rif: supplierRif.trim() || undefined,
        invoice_number: invoiceNumber.trim() || undefined,
        serial_number: serialNumber.trim() || undefined,
        mac_address: macAddress.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (!res.success) {
        toast.error("Error al registrar compra local", {
          description: res.error,
        });
        setIsSubmitting(false);
        return;
      }

      toast.success(res.message || "Compra local registrada exitosamente", {
        description: `Comprobante N° ${res.document_number}`,
      });

      // Limpiar formulario y cerrar
      setSelectedItemId("");
      setQuantity(1);
      setSupplierName("");
      setSupplierRif("");
      setInvoiceNumber("");
      setSerialNumber("");
      setMacAddress("");
      setNotes("");
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("Error inesperado en el servidor");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <ShoppingCart className="h-5 w-5" />
            Ingreso de Compra Local (Factura Directa)
          </DialogTitle>
          <DialogDescription>
            Registra materiales o equipos adquiridos directamente por la sucursal a proveedores regionales, sumando stock inmediato y generando comprobante oficial.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Ubicación / Depósito destino */}
          <div className="space-y-1">
            <Label htmlFor="loc-select" className="text-xs font-semibold">
              Almacén / Depósito de Destino
            </Label>
            <Select value={selectedLocation} onValueChange={setSelectedLocation}>
              <SelectTrigger id="loc-select" className="min-h-[44px]">
                <SelectValue placeholder="Seleccionar depósito" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name} ({loc.type === "branch" ? "Sede Central" : "Cuadrilla"})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Datos del Proveedor y Factura */}
          <div className="p-3 bg-muted/40 rounded-lg border space-y-3">
            <div className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-primary" />
              Datos Fiscales de Factura
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="supplier-name" className="text-xs">
                  Razón Social / Proveedor <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="supplier-name"
                  placeholder="Ej. Distribuidora Telco C.A."
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="min-h-[44px]"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="supplier-rif" className="text-xs">
                  RIF del Proveedor (Opcional)
                </Label>
                <Input
                  id="supplier-rif"
                  placeholder="Ej. J-12345678-9"
                  value={supplierRif}
                  onChange={(e) => setSupplierRif(e.target.value.toUpperCase())}
                  className="min-h-[44px]"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="invoice-num" className="text-xs">
                N° de Factura / Control Fiscal
              </Label>
              <Input
                id="invoice-num"
                placeholder="Ej. FAC-009412"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                className="min-h-[44px]"
              />
            </div>
          </div>

          {/* Selección de Material */}
          <div className="space-y-1">
            <Label htmlFor="item-select" className="text-xs font-semibold">
              Material o Equipo del Catálogo <span className="text-destructive">*</span>
            </Label>
            <Select value={selectedItemId} onValueChange={setSelectedItemId}>
              <SelectTrigger id="item-select" className="min-h-[44px]">
                <SelectValue placeholder="Seleccionar ítem a comprar..." />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {catalogItems.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    [{item.sku}] {item.name} ({item.unit}) {item.is_serialized ? "• Serializado" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Cantidad */}
          <div className="space-y-1">
            <Label htmlFor="qty-input" className="text-xs font-semibold">
              Cantidad {selectedItem ? `(${selectedItem.unit})` : ""}
            </Label>
            <Input
              id="qty-input"
              type="number"
              step={isSerialized ? "1" : "0.01"}
              min="1"
              value={isSerialized ? 1 : quantity}
              disabled={isSerialized}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="min-h-[44px]"
            />
            {isSerialized && (
              <p className="text-[11px] text-muted-foreground">
                Los equipos serializados se ingresan de a 1 unidad por Serial/MAC.
              </p>
            )}
          </div>

          {/* Campos Serial y MAC si aplica */}
          {isSerialized && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="serial-num" className="text-xs font-bold text-blue-900 dark:text-blue-300">
                  Número de Serial <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="serial-num"
                  placeholder="Ej. ZTEG0098FA12"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value.toUpperCase())}
                  className="font-mono min-h-[44px]"
                  required={isSerialized}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="mac-num" className="text-xs font-bold text-blue-900 dark:text-blue-300">
                  Dirección MAC (Opcional)
                </Label>
                <Input
                  id="mac-num"
                  placeholder="Ej. AA:BB:CC:DD:EE:FF"
                  value={macAddress}
                  onChange={(e) => setMacAddress(e.target.value.toUpperCase())}
                  className="font-mono min-h-[44px]"
                />
              </div>
            </div>
          )}

          {/* Observaciones */}
          <div className="space-y-1">
            <Label htmlFor="notes-input" className="text-xs">
              Notas u Observaciones del Ingreso
            </Label>
            <Input
              id="notes-input"
              placeholder="Ej. Comprado para atender emergencia en zona norte..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[44px]"
            />
          </div>

          <DialogFooter className="pt-3 border-t gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="gap-2 bg-primary font-semibold min-h-[44px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Acreditar en Stock
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
