import { z } from "zod";

export const materialRequestSchema = z.object({
  branch_id: z.string().uuid({ message: "Sucursal requerida" }),
  crew_location_id: z.string().uuid({ message: "Elige la cuadrilla que va a recibir." }),
  item_id: z.string().uuid({ message: "Elige un producto de la lista." }),
  quantity: z
    .number({ invalid_type_error: "La cantidad debe ser numérica" })
    .positive({ message: "La cantidad solicitada debe ser mayor a 0" }),
  ticket_ref: z.string().max(50).optional().nullable(),
  notes: z.string().max(300).optional().nullable(),
});

export type MaterialRequestInput = z.infer<typeof materialRequestSchema>;
