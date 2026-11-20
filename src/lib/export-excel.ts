import type { DocumentWithDetails } from "@/types/inventory";
import { formatDate } from "@/lib/utils";

export const exportDeliveryNotesToExcel = async (
  documents: DocumentWithDetails[],
  fileNamePrefix: string = "Notas_de_Entrega_Innover"
): Promise<void> => {
  const xlsxModule = await import("xlsx");
  const XLSX = xlsxModule.default ?? xlsxModule;
  if (!documents || documents.length === 0) {
    return;
  }

  // 1. Hoja Resumen de Notas de Entrega
  const summaryRows = documents.map((doc) => {
    const isClientJob = doc.work_type === "client_job";
    const totalUnits = doc.lines?.reduce((sum, line) => sum + Number(line.quantity || 0), 0) || 0;
    const itemsCount = doc.lines?.length || 0;

    return {
      "N° Nota Entrega": doc.delivery_note_number || "S/N",
      "Correlativo Salida": doc.document_number,
      "Fecha Emisión": formatDate(doc.created_at),
      "Almacén Origen": doc.origin_location?.name || doc.branch?.name || "Almacén",
      "Tipo de Trabajo":
        doc.work_type === "client_job"
          ? "Trabajo con Cliente / Instalación"
          : doc.work_type === "field_project"
          ? "Trabajo de Campo / Obra"
          : "Mantenimiento Interno",
      "Motivo": doc.reason || "Salida Interna",
      "Cliente": isClientJob ? doc.client_name || "-" : "N/A (Obra/Proyecto)",
      "Contrato / Cód. Cliente": isClientJob ? doc.client_code || "-" : "N/A",
      "Proyecto u Obra": !isClientJob ? doc.project_name || "-" : "N/A",
      "Técnico Responsable": doc.technician_name || "-",
      "Modo de Entrega":
        doc.receiver_mode === "warehouse_decides" ? "Decidido en almacén al despachar" : "Asignación directa",
      "Total Productos": itemsCount,
      "Total Unidades": totalUnits,
      "Estado":
        doc.status === "APPROVED"
          ? "DESPACHADO"
          : doc.status === "PENDING_APPROVAL"
            ? "PENDIENTE DE APROBACIÓN"
            : doc.status === "REJECTED"
              ? "RECHAZADO"
              : doc.status,
      "Emitido Por": doc.creator?.full_name || "Sistema",
      "Notas": doc.notes || "",
    };
  });

  // 2. Hoja Desglosada por Ítems / Materiales
  const detailedRows: any[] = [];
  documents.forEach((doc) => {
    const deliveryNote = doc.delivery_note_number || "S/N";
    const isClientJob = doc.work_type === "client_job";

    doc.lines?.forEach((line) => {
      detailedRows.push({
        "N° Nota Entrega": deliveryNote,
        "Correlativo": doc.document_number,
        "Fecha": formatDate(doc.created_at),
        "Almacén": doc.origin_location?.name || "-",
        "Cliente / Obra": isClientJob ? doc.client_name || "-" : doc.project_name || "-",
        "Técnico": doc.technician_name || "-",
        "SKU": line.item?.sku || "SKU-S/N",
        "Producto / Material": line.item?.name || "Material",
        "Categoría": line.item?.category || "General",
        "Cantidad Salida": Number(line.quantity),
        "Unidad": line.item?.unit || "unidades",
        "Serial Asignado": line.serial_unit?.serial_number || (line.serial_unit_id ? "Serial registrado" : "N/A"),
        "MAC Address": line.serial_unit?.mac_address || "N/A",
      });
    });
  });

  // Crear libro de trabajo (Workbook)
  const workbook = XLSX.utils.book_new();

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  const detailedSheet = XLSX.utils.json_to_sheet(detailedRows);

  // Auto-ajustar ancho de columnas básico
  const summaryCols = Object.keys(summaryRows[0] || {}).map(() => ({ wch: 22 }));
  summarySheet["!cols"] = summaryCols;

  if (detailedRows.length > 0) {
    const detailedCols = Object.keys(detailedRows[0] || {}).map(() => ({ wch: 22 }));
    detailedSheet["!cols"] = detailedCols;
  }

  XLSX.utils.book_append_sheet(workbook, summarySheet, "Notas de Entrega");
  XLSX.utils.book_append_sheet(workbook, detailedSheet, "Detalle de Materiales");

  const todayStr = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `${fileNamePrefix}_${todayStr}.xlsx`);
};
