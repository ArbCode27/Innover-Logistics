/**
 * Glosario único de la interfaz.
 * Un concepto, un nombre. Los textos visibles salen de aquí.
 */

export const terms = {
  product: "Producto",
  products: "Productos",
  code: "Código",
  warehouse: "Almacén",
  warehouses: "Almacenes",
  crew: "Almacen",
  crews: "Cuadrillas",
  technician: "Técnico",
  technicians: "Técnicos",
  entry: "Entrada",
  exit: "Salida",
  transfer: "Traslado",
  transfers: "Traslados",
  request: "Pedido",
  requests: "Pedidos",
  history: "Historial",
  serial: "Número de serie",
  mac: "Dirección MAC",
  available: "Cantidad disponible",
  minimum: "Cantidad mínima",
  outOfStock: "Agotado",
  lowStock: "Poca cantidad",
  voucher: "Comprobante",
  branch: "Sede",
  branches: "Sedes",
  category: "Categoría",
  unit: "Unidad",
  notes: "Notas",
  date: "Fecha",
  quantity: "Cantidad",
  client: "Cliente",
  search: "Buscar",
} as const;

export const roles = {
  superadmin: "Administrador general",
  admin_sucursal: "Administrador de sede",
  reportador: "Registro de campo",
  tecnico: "Técnico",
} as const;

export const nav = {
  section: "Menú",
  inventory: "Inventario",
  phoneEntry: "Entrada con teléfono",
  sendTransfer: "Enviar traslado",
  receiveTransfer: "Recibir traslado",
  crews: "Cuadrillas",
  technicians: "Técnicos",
  approvals: "Aprobaciones",
  exits: "Salidas",
  requests: "Pedidos",
  history: "Historial",
  admin: "Administración",
} as const;

export const buttons = {
  registerEntry: "Registrar entrada",
  registerExit: "Registrar salida",
  registerTransfer: "Registrar traslado",
  receiveTransfer: "Recibir traslado",
  rejectTransfer: "Rechazar traslado",
  addProduct: "Agregar producto",
  saveChanges: "Guardar cambios",
  createRequest: "Crear pedido",
  newRequest: "Nuevo pedido",
  assignToCrew: "Asignar a la cuadrilla",
  newCrew: "Nueva cuadrilla",
  cancel: "Cancelar",
  close: "Cerrar",
  confirm: "Confirmar",
  voidDocument: "Anular documento",
  viewVoucher: "Ver comprobante",
  printVoucher: "Imprimir comprobante",
  approve: "Aprobar pedido",
  rejectRequest: "Rechazar pedido",
  approveOrder: "Aprobar orden",
  rejectOrder: "Rechazar orden",
  saveTechnician: "Guardar técnico",
  deliver: "Entregar pedido",
  previous: "Anterior",
  next: "Siguiente",
  clearFilters: "Quitar filtros",
  seeAll: "Ver todos",
  seeLow: "Ver con poca cantidad",
  seeOut: "Ver agotados",
  usePhone: "Usar el teléfono",
  localPurchase: "Registrar compra",
  exportExcel: "Descargar Excel",
  login: "Entrar",
  logout: "Cerrar sesión",
  addLine: "Agregar producto",
  removeLine: "Quitar producto",
  review: "Revisar traslado",
  seeDetail: "Ver detalle",
  backToInventory: "Volver al inventario",
  copyLink: "Copiar enlace",
} as const;

export const hints = {
  required: "Obligatorio",
  optional: "Opcional",
  connection:
    "No hay conexión con el servidor. Espera un momento e inténtalo de nuevo.",
  stockRule:
    "La cantidad disponible se actualiza sola con cada entrada, salida y traslado.",
  fixFields: "Revisa los campos marcados e inténtalo de nuevo.",
} as const;

export const explainError = (
  action: string,
  detail?: string | null,
): string => {
  const base = `No se pudo ${action}. ${hints.fixFields}`;
  if (!detail) return base;
  return `${base} Detalle: ${detail}`;
};
