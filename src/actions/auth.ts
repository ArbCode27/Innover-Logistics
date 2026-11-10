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

// Demo profiles for offline/standalone preview if Supabase project credentials are pending
const DEMO_PROFILES: Record<string, Profile> = {
  "superadmin@tvstar.com": {
    id: "u0000000-0000-0000-0000-000000000001",
    email: "superadmin@tvstar.com",
    full_name: "Carlos Mendoza (Superadmin)",
    phone: "+58 412 111 2233",
    role: "superadmin",
    branch_id: "b0000000-0000-0000-0000-000000000001",
    crew_id: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  "admin.maracaibo@tvstar.com": {
    id: "u0000000-0000-0000-0000-000000000002",
    email: "admin.maracaibo@tvstar.com",
    full_name: "Mariana Rivas (Admin Maracaibo)",
    phone: "+58 414 222 3344",
    role: "admin_sucursal",
    branch_id: "b0000000-0000-0000-0000-000000000002",
    crew_id: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  "reportador.maracaibo@tvstar.com": {
    id: "u0000000-0000-0000-0000-000000000003",
    email: "reportador.maracaibo@tvstar.com",
    full_name: "Luis González (Reportador Campo)",
    phone: "+58 424 333 4455",
    role: "reportador",
    branch_id: "b0000000-0000-0000-0000-000000000002",
    crew_id: null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  "tecnico.maracaibo@tvstar.com": {
    id: "u0000000-0000-0000-0000-000000000004",
    email: "tecnico.maracaibo@tvstar.com",
    full_name: "José Pirela (Técnico Cuadrilla 01)",
    phone: "+58 416 444 5566",
    role: "tecnico",
    branch_id: "b0000000-0000-0000-0000-000000000002",
    crew_id: "l0000000-0000-0000-0000-000000000010",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
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
  } catch {
    // If Supabase connection fails or local placeholder is used, check demo profiles
  }

  // Demo Fallback for development/testing
  const demoProfile = DEMO_PROFILES[email.toLowerCase()];
  if (demoProfile && password === "star1234") {
    const cookieStore = await cookies();
    cookieStore.set("demo_user_email", email.toLowerCase(), {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    revalidatePath("/", "layout");
    return {
      success: true,
      user: {
        id: demoProfile.id,
        email: demoProfile.email,
        role: demoProfile.role,
        branch_id: demoProfile.branch_id,
      },
    };
  }

  return {
    success: false,
    error:
      "Credenciales incorrectas. Verifique su correo y contraseña (para demo use contraseña: star1234)",
  };
};

export const logoutAction = async (): Promise<void> => {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Ignore error
  }

  const cookieStore = await cookies();
  cookieStore.delete("demo_user_email");

  revalidatePath("/", "layout");
  redirect("/login");
};

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const cookieStore = await cookies();
  const demoEmail = cookieStore.get("demo_user_email")?.value;
  if (demoEmail && DEMO_PROFILES[demoEmail]) {
    return DEMO_PROFILES[demoEmail];
  }

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
      // Fall back to demo cookie
    }
  }

  // Default demo user for seamless UX if no session exists
  return DEMO_PROFILES["superadmin@tvstar.com"];
});
