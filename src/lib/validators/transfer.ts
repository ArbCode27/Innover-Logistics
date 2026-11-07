import { z } from "zod";

export const transferLineSchema = z.object({
  item_id: z.string().uuid({ message: "ID de ítem inválido" }),
  quantity: z
    .number({ invalid_type_error: "La cantidad debe ser numérica" })
    .positive({ message: "La cantidad debe ser mayor a 0" }),
  serial_unit_id: z.string().uuid().optional().nullable(),
  notes: z.string().max(250).optional().nullable(),
});

export const issueTransferSchema = z
  .object({
    origin_location_id: z
      .string()
      .uuid({ message: "Seleccione el almacén de origen" }),
    destination_location_id: z
      .string()
      .uuid({ message: "Seleccione el almacén de destino" }),
    lines: z
      .array(transferLineSchema)
      .min(1, { message: "Debe agregar al menos un ítem a la transferencia" }),
    notes: z.string().max(500).optional().nullable(),
  })
  .refine(
    (data) => data.origin_location_id !== data.destination_location_id,
    {
      message: "El almacén de destino no puede ser igual al almacén de origen",
      path: ["destination_location_id"],
    }
  );

export const acceptTransferSchema = z.object({
  document_id: z.string().uuid(),
  action: z.enum(["ACCEPT", "REJECT"]),
  accepted_lines: z
    .array(
      z.object({
        line_id: z.string().uuid(),
        received_quantity: z.number().min(0),
      })
    )
    .optional(),
  notes: z.string().max(500).optional().nullable(),
});

export type IssueTransferInput = z.infer<typeof issueTransferSchema>;
export type AcceptTransferInput = z.infer<typeof acceptTransferSchema>;
