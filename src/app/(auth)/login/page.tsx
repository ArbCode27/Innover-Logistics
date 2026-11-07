"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Boxes, Loader2, LogIn, ShieldAlert, UserCheck } from "lucide-react";
import { toast } from "sonner";

import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LoginPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const [authError, setAuthError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "superadmin@tvstar.com",
      password: "star1234",
    },
  });

  const onSubmit = async (data: LoginInput): Promise<void> => {
    setIsSubmitting(true);
    setAuthError(null);

    try {
      const response = await loginAction(data);
      if (!response.success) {
        setAuthError(response.error ?? "No se pudo iniciar sesión.");
        toast.error("Error de autenticación", {
          description: response.error,
        });
        setIsSubmitting(false);
        return;
      }

      toast.success("¡Bienvenido a Star Conectados!", {
        description: `Sesión iniciada como ${response.user?.email}`,
      });

      router.push("/inventario");
      router.refresh();
    } catch {
      setAuthError("Ocurrió un error inesperado al procesar la solicitud.");
      toast.error("Error al conectar con el servidor");
      setIsSubmitting(false);
    }
  };

  const handleSelectRolePreset = (email: string): void => {
    setValue("email", email, { shouldValidate: true });
    setValue("password", "star1234", { shouldValidate: true });
    setAuthError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-500/30 mb-2">
            <Boxes className="h-8 w-8" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Star Conectados
          </h1>
          <p className="text-sm text-slate-300">
            Tv Star Satellite, C.A. • Desarrollado por Innover
          </p>
        </div>

        {/* Login Form Card */}
        <Card className="border-slate-800 bg-slate-900/90 text-slate-100 shadow-2xl backdrop-blur-md">
          <CardHeader className="space-y-1">
            <CardTitle className="text-xl font-bold">Iniciar Sesión</CardTitle>
            <CardDescription className="text-slate-400">
              Ingrese con sus credenciales autorizadas del sistema de inventario.
            </CardDescription>
          </CardHeader>

          <CardContent>
            {authError && (
              <div
                role="alert"
                className="mb-4 flex items-start gap-2 rounded-md bg-destructive/15 border border-destructive/30 p-3 text-sm text-red-400"
              >
                <ShieldAlert className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-200">
                  Correo Electrónico
                </Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="usuario@tvstar.com"
                  className="bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  {...register("email")}
                />
                {errors.email && (
                  <p
                    id="email-error"
                    className="text-xs text-red-400"
                    role="alert"
                  >
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-200">
                    Contraseña
                  </Label>
                  <span className="text-xs text-slate-400">
                    Demo: star1234
                  </span>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="bg-slate-950/60 border-slate-700 text-white placeholder:text-slate-500"
                  aria-invalid={!!errors.password}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  {...register("password")}
                />
                {errors.password && (
                  <p
                    id="password-error"
                    className="text-xs text-red-400"
                    role="alert"
                  >
                    {errors.password.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full gap-2 font-semibold shadow-md bg-blue-600 hover:bg-blue-500 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  <>
                    <LogIn className="h-5 w-5" />
                    Ingresar a la Plataforma
                  </>
                )}
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 border-t border-slate-800/80 pt-4">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <UserCheck className="h-3.5 w-3.5 text-blue-400" />
              <span>Acceso rápido por perfil de prueba:</span>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs border-slate-700 bg-slate-950/40 text-slate-300 hover:bg-slate-800 hover:text-white justify-start"
                onClick={() => handleSelectRolePreset("superadmin@tvstar.com")}
              >
                <Badge variant="default" className="mr-1 text-[10px] py-0 px-1">
                  Global
                </Badge>
                Superadmin
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs border-slate-700 bg-slate-950/40 text-slate-300 hover:bg-slate-800 hover:text-white justify-start"
                onClick={() =>
                  handleSelectRolePreset("admin.maracaibo@tvstar.com")
                }
              >
                <Badge variant="info" className="mr-1 text-[10px] py-0 px-1">
                  Sede
                </Badge>
                Admin Sucursal
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs border-slate-700 bg-slate-950/40 text-slate-300 hover:bg-slate-800 hover:text-white justify-start"
                onClick={() =>
                  handleSelectRolePreset("reportador.maracaibo@tvstar.com")
                }
              >
                <Badge variant="warning" className="mr-1 text-[10px] py-0 px-1">
                  Campo
                </Badge>
                Reportador
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs border-slate-700 bg-slate-950/40 text-slate-300 hover:bg-slate-800 hover:text-white justify-start"
                onClick={() =>
                  handleSelectRolePreset("tecnico.maracaibo@tvstar.com")
                }
              >
                <Badge variant="success" className="mr-1 text-[10px] py-0 px-1">
                  OT
                </Badge>
                Técnico Cuadrilla
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
