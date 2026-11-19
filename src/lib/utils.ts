import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]): string => {
  return twMerge(clsx(inputs));
};

export const formatNumber = (value: number, decimals = 2): string => {
  return new Intl.NumberFormat("es-VE", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatDate = (date: string | Date): string => {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-VE", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

export const formatDatabaseError = (error: unknown): string => {
  if (!error) return "Ocurrió un error inesperado al procesar la operación.";

  const message =
    typeof error === "string"
      ? error
      : typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);

  if (
    message.includes("stock_balances_quantity_check") ||
    message.includes("INSUFFICIENT_STOCK") ||
    message.includes("does not have enough stock")
  ) {
    return "Stock insuficiente: El almacén de origen no cuenta con la cantidad física disponible para realizar esta operación.";
  }

  if (message.includes("Ubicación origen no encontrada")) {
    return "El almacén de origen seleccionado no existe o está inactivo.";
  }

  if (message.includes("Ubicación destino no encontrada")) {
    return "El almacén de destino seleccionado no existe o está inactivo.";
  }

  if (message.includes("pertenezcan a sucursales diferentes")) {
    return "Restricción de traslado: El almacén de origen y destino deben pertenecer a sucursales diferentes.";
  }

  if (
    message.includes("no se encuentra disponible en stock") ||
    message.includes("serial") && message.includes("not found")
  ) {
    return "El equipo o número de serial seleccionado no se encuentra disponible en el almacén de origen.";
  }

  if (message.includes("violates not-null constraint") && message.includes("created_by")) {
    return "No se pudo identificar al usuario responsable de la emisión. Verifique su sesión activa.";
  }

  if (message.includes("uq_technicians_document_id")) {
    return "Ya existe un técnico registrado con esa cédula.";
  }

  if (message.includes("unique") || message.includes("duplicate key")) {
    return "El registro o correlativo ya existe en el sistema. Intente nuevamente.";
  }

  if (message.includes("foreign key") || message.includes("violates foreign key")) {
    return "Uno de los elementos seleccionados (producto, almacén o usuario) no es válido.";
  }

  return message;
};
