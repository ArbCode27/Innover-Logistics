import { z } from "zod";

export const dispatchLineSchema = z.object({
  item_id: z.string().uuid({ message: "Seleccione un producto válido" }),
  quantity: z
    .number({ invalid_type_error: "La cantidad debe ser numérica" })
    .positive({ message: "La cantidad debe ser mayor a 0" }),
  serial_unit_id: z.string().uuid().optional().nullable(),
});

export const dispatchOrderFormSchema = z
  .object({
    location_id: z.string().uuid({ message: "Seleccione el almacén de origen" }),
    date: z.string().min(1, { message: "La fecha es obligatoria" }),
    work_type: z.enum(["client_job", "field_project", "internal_maintenance"], {
      required_error: "Seleccione el motivo o tipo de trabajo",
    }),
    reason: z
      .string()
      .trim()
      .min(2, { message: "Especifique el motivo o descripción del trabajo" })
      .max(200, { message: "El motivo no debe exceder 200 caracteres" }),
    // Campos condicionales para Cliente
    client_name: z.string().trim().optional(),
    client_code: z.string().trim().optional(),
    // Campos condicionales para Obra / Proyecto
    project_name: z.string().trim().optional(),
    // Campos generales
    technician_name: z.string().trim().optional(),
    technician_id: z.string().uuid().optional().nullable(),
    receiver_mode: z.string().default("warehouse_decides"),
    notes: z.string().max(500, { message: "Las notas no deben exceder 500 caracteres" }).optional().nullable(),
    lines: z
      .array(dispatchLineSchema)
      .min(1, { message: "Debe agregar al menos un producto a la salida" }),
  })
  .superRefine((data, ctx) => {
    if (data.work_type === "client_job") {
      if (!data.client_name || data.client_name.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["client_name"],
          message: "El nombre o razón social del cliente es obligatorio",
        });
      }
      if (!data.client_code || data.client_code.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["client_code"],
          message: "El contrato o código del cliente es obligatorio",
        });
      }
    } else if (data.work_type === "field_project") {
      if (!data.project_name || data.project_name.trim().length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["project_name"],
          message: "El nombre del proyecto u obra es obligatorio",
        });
      }
    }
  });

export type DispatchOrderInput = z.infer<typeof dispatchOrderFormSchema>;
