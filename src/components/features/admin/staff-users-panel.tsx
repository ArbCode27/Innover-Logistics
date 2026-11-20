"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { createStaffUserAction, type StaffProfile } from "@/actions/admin";
import { EmptyState } from "@/components/features/inventory/design-system/empty-state";
import { ListPager } from "@/components/shared/list-pager";
import { RequiredMark } from "@/components/shared/required-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { roles } from "@/lib/glossary";
import { usePagedList } from "@/lib/use-paged-list";
import type { Branch } from "@/types/inventory";

interface StaffUsersPanelProps {
  branches: Branch[];
  profiles: StaffProfile[];
}

const emptyForm = (branchId: string) => ({
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  role: "admin_sucursal" as "admin_sucursal" | "reportador",
  branchId,
});

export const StaffUsersPanel: React.FC<StaffUsersPanelProps> = ({
  branches,
  profiles,
}) => {
  const router = useRouter();
  const [form, setForm] = React.useState(() => emptyForm(branches[0]?.id || ""));
  const [isSaving, setIsSaving] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const branchName = (branchId: string | null): string =>
    branches.find((branch) => branch.id === branchId)?.name || "Sin sede";

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return profiles;
    return profiles.filter((profile) => {
      const roleLabel = roles[profile.role].toLowerCase();
      return (
        profile.full_name.toLowerCase().includes(needle) ||
        profile.email.toLowerCase().includes(needle) ||
        branchName(profile.branch_id).toLowerCase().includes(needle) ||
        roleLabel.includes(needle)
      );
    });
  }, [profiles, query, branches]);

  const pager = usePagedList(filtered, query);

  const handleChange =
    (field: keyof ReturnType<typeof emptyForm>) =>
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }
    if (!form.branchId) {
      toast.error("Selecciona la sede");
      return;
    }

    setIsSaving(true);
    try {
      const result = await createStaffUserAction({
        full_name: form.fullName,
        email: form.email,
        password: form.password,
        phone: form.phone || null,
        role: form.role,
        branch_id: form.branchId,
      });

      if (!result.success) {
        toast.error("No se pudo crear el perfil", { description: result.error });
        return;
      }

      toast.success("Perfil creado. Ya puede entrar con ese correo y contraseña.");
      setForm(emptyForm(form.branchId));
      router.refresh();
    } catch {
      toast.error("No hay conexión con el servidor. Espera un momento e inténtalo de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <Card className="border shadow-sm">
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4 text-primary" aria-hidden="true" />
              Nuevo perfil
            </CardTitle>
            <CardDescription>
              Crea la cuenta de un administrador de sede o de registro de campo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="staff-name">
                Nombre completo
                <RequiredMark />
              </Label>
              <Input
                id="staff-name"
                value={form.fullName}
                onChange={handleChange("fullName")}
                autoComplete="name"
                className="min-h-[44px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-email">
                Correo
                <RequiredMark />
              </Label>
              <Input
                id="staff-email"
                type="email"
                value={form.email}
                onChange={handleChange("email")}
                autoComplete="off"
                className="min-h-[44px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-password">
                Contraseña
                <RequiredMark />
              </Label>
              <Input
                id="staff-password"
                type="password"
                value={form.password}
                onChange={handleChange("password")}
                autoComplete="new-password"
                minLength={6}
                className="min-h-[44px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-password-confirm">
                Confirmar contraseña
                <RequiredMark />
              </Label>
              <Input
                id="staff-password-confirm"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange("confirmPassword")}
                autoComplete="new-password"
                minLength={6}
                className="min-h-[44px]"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-phone">Teléfono</Label>
              <Input
                id="staff-phone"
                value={form.phone}
                onChange={handleChange("phone")}
                autoComplete="tel"
                className="min-h-[44px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-role">
                Perfil
                <RequiredMark />
              </Label>
              <Select
                value={form.role}
                onValueChange={(value: "admin_sucursal" | "reportador") =>
                  setForm((current) => ({ ...current, role: value }))
                }
              >
                <SelectTrigger id="staff-role" className="min-h-[44px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_sucursal">{roles.admin_sucursal}</SelectItem>
                  <SelectItem value="reportador">{roles.reportador}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff-branch">
                Sede
                <RequiredMark />
              </Label>
              <Select
                value={form.branchId}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, branchId: value }))
                }
              >
                <SelectTrigger id="staff-branch" className="min-h-[44px]">
                  <SelectValue placeholder="Selecciona la sede" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSaving || branches.length === 0} className="min-h-[44px] gap-2">
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <UserPlus className="h-4 w-4" aria-hidden="true" />
              )}
              Crear perfil
            </Button>
          </CardFooter>
        </form>
      </Card>

      <Card className="border shadow-sm lg:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Perfiles de sede</CardTitle>
          <CardDescription>
            Administradores de sede y registros de campo que ya pueden entrar al sistema.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="staff-search" className="sr-only">
              Buscar perfil
            </Label>
            <Input
              id="staff-search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, correo, sede o perfil"
              className="min-h-[44px] sm:max-w-sm"
            />
          </div>

          {profiles.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="Todavía no hay perfiles de sede"
              description="Crea el primer administrador de sede o registro de campo."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={UserPlus}
              title="Ningún perfil coincide"
              description="Prueba con otro nombre, correo o sede."
            />
          ) : (
            <div className="overflow-hidden rounded-xl border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead className="hidden md:table-cell">Correo</TableHead>
                    <TableHead>Sede</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pager.rows.map((profile) => (
                    <TableRow key={profile.id}>
                      <TableCell>
                        <div className="font-medium">{profile.full_name}</div>
                        <div className="text-xs text-muted-foreground md:hidden">{profile.email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={profile.role === "admin_sucursal" ? "info" : "secondary"}>
                          {roles[profile.role]}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {profile.email}
                      </TableCell>
                      <TableCell className="text-sm">{branchName(profile.branch_id)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <ListPager
                page={pager.page}
                pageCount={pager.pageCount}
                total={pager.total}
                onPage={pager.setPage}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
