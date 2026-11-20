import { z } from "zod";

export const staffUserSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(3, { message: "El nombre debe tener al menos 3 caracteres" })
    .max(120, { message: "El nombre no debe exceder 120 caracteres" }),
  email: z
    .string()
    .trim()
    .email({ message: "Ingresa un correo válido" })
    .max(160, { message: "El correo no debe exceder 160 caracteres" }),
  password: z
    .string()
    .min(6, { message: "La contraseña debe tener al menos 6 caracteres" })
    .max(72, { message: "La contraseña no debe exceder 72 caracteres" }),
  phone: z
    .string()
    .trim()
    .max(30, { message: "El teléfono no debe exceder 30 caracteres" })
    .optional()
    .nullable(),
  role: z.enum(["admin_sucursal", "reportador"], {
    errorMap: () => ({ message: "Elige administrador de sede o registro de campo" }),
  }),
  branch_id: z.string().uuid({ message: "Selecciona la sede" }),
});

export type StaffUserInput = z.infer<typeof staffUserSchema>;
