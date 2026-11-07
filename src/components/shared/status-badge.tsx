import * as React from "react";
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Truck,
  RotateCcw,
  Ban,
  PackageCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DocumentStatus, RequestStatus, SerialStatus } from "@/types/inventory";

interface StatusBadgeProps {
  status: DocumentStatus | RequestStatus | SerialStatus | string;
  type?: "document" | "request" | "serial";
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = "document",
}) => {
  switch (status) {
    case "APPROVED":
      return (
        <Badge variant="success" className="gap-1 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Aprobado</span>
        </Badge>
      );
    case "PENDING":
      return (
        <Badge variant="warning" className="gap-1 font-medium">
          <Truck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>En Tránsito / Pendiente</span>
        </Badge>
      );
    case "DRAFT":
      return (
        <Badge variant="secondary" className="gap-1 font-medium">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Borrador</span>
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge variant="destructive" className="gap-1 font-medium">
          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Rechazado</span>
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge variant="destructive" className="gap-1 font-medium opacity-90">
          <Ban className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Anulado (Contra-asiento)</span>
        </Badge>
      );
    case "REQUESTED":
      return (
        <Badge variant="info" className="gap-1 font-medium">
          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Solicitado</span>
        </Badge>
      );
    case "DELIVERED":
      return (
        <Badge variant="success" className="gap-1 font-medium">
          <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Entregado</span>
        </Badge>
      );
    case "CONSUMED":
    case "consumed":
      return (
        <Badge variant="secondary" className="gap-1 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Consumido en Campo</span>
        </Badge>
      );
    case "in_stock":
      return (
        <Badge variant="success" className="gap-1 font-medium">
          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Disponible</span>
        </Badge>
      );
    case "in_transit":
      return (
        <Badge variant="warning" className="gap-1 font-medium">
          <Truck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>En Tránsito</span>
        </Badge>
      );
    case "assigned_crew":
      return (
        <Badge variant="info" className="gap-1 font-medium">
          <PackageCheck className="h-3.5 w-3.5" aria-hidden="true" />
          <span>En Cuadrilla</span>
        </Badge>
      );
    case "RETURNED":
    case "returned":
      return (
        <Badge variant="outline" className="gap-1 font-medium">
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Devuelto</span>
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="gap-1 font-medium">
          <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{status}</span>
        </Badge>
      );
  }
};
