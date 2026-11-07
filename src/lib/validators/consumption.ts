import { z } from "zod";

export const consumptionLineSchema = z.object({
  item_id: z.string().uuid({ message: "Ítem inválido" }),
  quantity: z
    .number({ invalid_type_error: "La cantidad debe ser numérica" })
    .positive({ message: "La cantidad consumida debe ser mayor a 0" }),
  serial_unit_id: z.string().uuid().optional().nullable(),
});

export const consumptionSchema = z.object({
  crew_location_id: z
    .string()
    .uuid({ message: "Seleccione la cuadrilla técnica" }),
  ticket_ref: z
    .string()
    .trim()
    .min(1, { message: "El número de ticket u orden de trabajo (OT) es obligatorio" })
    .max(50, { message: "El ticket no debe exceder 50 caracteres" }),
  reason: z
    .string()
    .trim()
    .min(3, { message: "El motivo del consumo es obligatorio (mínimo 3 caracteres)" })
    .max(250, { message: "El motivo no debe exceder 250 caracteres" }),
  lines: z
    .array(consumptionLineSchema)
    .min(1, { message: "Debe registrar al menos un material o equipo consumido" }),
  notes: z.string().max(500).optional().nullable(),
});

export type ConsumptionInput = z.infer<typeof consumptionSchema>;
