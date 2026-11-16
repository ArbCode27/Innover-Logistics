"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import type { Profile } from "@/types/inventory";

export interface AuthResponse {
  success: boolean;
  error?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    branch_id: string | null;
  };
}

// Perfil activo principal en base de datos
const MAIN_PROFILE: Profile = {
  id: "d734dd4f-d8c2-473c-a39b-a5bc07ecd57f",
  email: "tvstarmiranda@gmail.com",
  full_name: "Administrador Innover TV Star",
  phone: "+58 212 900 1100",
  role: "superadmin",
  branch_id: "b0000000-0000-0000-0000-000000000001",
  crew_id: null,
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

export const loginAction = async (values: LoginInput): Promise<AuthResponse> => {
  const parsed = loginSchema.safeParse(values);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Datos de acceso inválidos",
    };
  }

  const { email, password } = parsed.data;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (!error && data.user) {
      // Query profile
      const { data: profile } = (await supabase
        .from("profiles")
        .select("*")
        .eq("id", data.user.id)
        .single()) as { data: Profile | null; error: any };

      revalidatePath("/", "layout");
      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email ?? email,
          role: profile?.role ?? "tecnico",
          branch_id: profile?.branch_id ?? null,
        },
      };
    }
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || "Error al autenticar con el servidor de base de datos",
    };
  }

  return {
    success: false,
    error: "Credenciales incorrectas. Verifique su correo y contraseña.",
  };
};

export const logoutAction = async (): Promise<void> => {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore error
  }

  revalidatePath("/", "layout");
  redirect("/login");
};

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const cookieStore = await cookies();
  const hasAuthToken = cookieStore
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  if (hasAuthToken) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = (await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single()) as { data: Profile | null; error: any };

        if (profile) return profile as Profile;
      }
    } catch {
      // Continuar con perfil principal
    }
  }

  return MAIN_PROFILE;
});
