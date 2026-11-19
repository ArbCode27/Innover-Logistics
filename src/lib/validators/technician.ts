import { z } from "zod";

export const technicianFormSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, { message: "El nombre debe tener al menos 3 caracteres" })
    .max(120, { message: "El nombre no debe exceder 120 caracteres" }),
  document_id: z
    .string()
    .trim()
    .min(5, { message: "La cédula debe tener al menos 5 caracteres" })
    .max(20, { message: "La cédula no debe exceder 20 caracteres" }),
  phone: z
    .string()
    .trim()
    .max(30, { message: "El teléfono no debe exceder 30 caracteres" })
    .optional()
    .nullable(),
  branch_id: z.string().uuid({ message: "Seleccione la sede del técnico" }),
  is_active: z.boolean().default(true),
});

export const reviewDocumentSchema = z
  .object({
    document_id: z.string().uuid(),
    action: z.enum(["APPROVE", "REJECT"]),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.action === "REJECT" && (!data.notes || data.notes.trim().length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["notes"],
        message: "Indique el motivo del rechazo",
      });
    }
  });

export type TechnicianFormInput = z.infer<typeof technicianFormSchema>;
export type ReviewDocumentInput = z.infer<typeof reviewDocumentSchema>;
