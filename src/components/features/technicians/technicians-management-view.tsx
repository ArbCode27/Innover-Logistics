"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Pencil, Phone, Plus, UserRound, UserX } from "lucide-react";
import { toast } from "sonner";

import {
  saveTechnicianAction,
  setTechnicianActiveAction,
} from "@/actions/technicians";
import { EmptyState } from "@/components/features/inventory/design-system/empty-state";
import { ListPager } from "@/components/shared/list-pager";
import { PageHeader } from "@/components/shared/page-header";
import { RequiredMark } from "@/components/shared/required-mark";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { buttons, nav, terms } from "@/lib/glossary";
import { usePagedList } from "@/lib/use-paged-list";
import type { Branch, Technician, UserRole } from "@/types/inventory";

interface TechniciansManagementViewProps {
  technicians: Technician[];
  branches: Branch[];
  userRole: UserRole;
  userBranchId: string | null;
}

interface TechnicianDraft {
  id?: string;
  full_name: string;
  document_id: string;
  phone: string;
  branch_id: string;
  is_active: boolean;
}

const emptyDraft = (branchId: string): TechnicianDraft => ({
  full_name: "",
  document_id: "",
  phone: "",
  branch_id: branchId,
  is_active: true,
});

export const TechniciansManagementView: React.FC<TechniciansManagementViewProps> = ({
  technicians,
  branches,
  userRole,
  userBranchId,
}) => {
  const router = useRouter();
  const [query, setQuery] = React.useState("");
  const [draft, setDraft] = React.useState<TechnicianDraft | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const lockedBranchId = userRole === "admin_sucursal" ? userBranchId : null;
  const branchName = (branchId: string) =>
    branches.find((branch) => branch.id === branchId)?.name || "Sede";

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return technicians;
    return technicians.filter((technician) => {
      const branch = branchName(technician.branch_id).toLowerCase();
      return (
        technician.full_name.toLowerCase().includes(needle) ||
        technician.document_id.toLowerCase().includes(needle) ||
        (technician.phone || "").toLowerCase().includes(needle) ||
        branch.includes(needle)
      );
    });
  }, [technicians, query, branches]);

  const pager = usePagedList(filtered, query);

  const handleOpenCreate = (): void => {
    setDraft(emptyDraft(lockedBranchId || branches[0]?.id || ""));
  };

  const handleOpenEdit = (technician: Technician): void => {
    setDraft({
      id: technician.id,
      full_name: technician.full_name,
      document_id: technician.document_id,
      phone: technician.phone || "",
      branch_id: technician.branch_id,
      is_active: technician.is_active,
    });
  };

  const handleSave = async (): Promise<void> => {
    if (!draft) return;
    setIsSaving(true);
    try {
      const result = await saveTechnicianAction(
        {
          full_name: draft.full_name,
          document_id: draft.document_id,
          phone: draft.phone,
          branch_id: draft.branch_id,
          is_active: draft.is_active,
        },
        draft.id
      );

      if (!result.success) {
        toast.error("No se pudo guardar el técnico", { description: result.error });
        return;
      }

      toast.success(draft.id ? "Técnico actualizado" : "Técnico registrado");
      setDraft(null);
      router.refresh();
    } catch {
      toast.error("No hay conexión con el servidor. Espera un momento e inténtalo de nuevo.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (technician: Technician): Promise<void> => {
    setPendingId(technician.id);
    try {
      const result = await setTechnicianActiveAction(technician.id, !technician.is_active);
      if (!result.success) {
        toast.error("No se pudo actualizar el técnico", { description: result.error });
        return;
      }
      toast.success(technician.is_active ? "Técnico desactivado" : "Técnico activado");
      router.refresh();
    } catch {
      toast.error("No hay conexión con el servidor. Espera un momento e inténtalo de nuevo.");
    } finally {
      setPendingId(null);
    }
  };

  return (
    <motion.div
      className="mx-auto max-w-6xl space-y-6"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <PageHeader
        icon={UserRound}
        title={nav.technicians}
        description="Registra a la persona que retira el material. Esa lista se usa al emitir una salida."
        action={
          <Button type="button" onClick={handleOpenCreate} className="min-h-[44px] gap-2">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo técnico
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Label htmlFor="technician-search" className="sr-only">
          Buscar técnico
        </Label>
        <Input
          id="technician-search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nombre, cédula o sede"
          className="min-h-[44px] sm:max-w-sm"
        />
      </div>

      {technicians.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="No hay técnicos para mostrar"
          description="Registra al primer técnico para poder asignarlo en las órdenes de salida."
          actionLabel="Nuevo técnico"
          onAction={handleOpenCreate}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={UserRound}
          title="Ningún técnico coincide"
          description="Prueba con otro nombre, cédula o sede."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Cédula</TableHead>
                <TableHead className="hidden md:table-cell">Teléfono</TableHead>
                <TableHead>Sede</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pager.rows.map((technician, index) => (
                <motion.tr
                  key={technician.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                  className="border-b transition-colors hover:bg-muted/40"
                >
                  <TableCell className="font-medium">{technician.full_name}</TableCell>
                  <TableCell className="font-mono text-xs">{technician.document_id}</TableCell>
                  <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                    {technician.phone || "—"}
                  </TableCell>
                  <TableCell className="text-sm">{branchName(technician.branch_id)}</TableCell>
                  <TableCell>
                    <Badge variant={technician.is_active ? "success" : "secondary"}>
                      {technician.is_active ? "Activo" : "Inactivo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        aria-label={`Editar a ${technician.full_name}`}
                        onClick={() => handleOpenEdit(technician)}
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10"
                        aria-label={
                          technician.is_active
                            ? `Desactivar a ${technician.full_name}`
                            : `Activar a ${technician.full_name}`
                        }
                        disabled={pendingId === technician.id}
                        onClick={() => {
                          void handleToggleActive(technician);
                        }}
                      >
                        {pendingId === technician.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <UserX className="h-4 w-4" aria-hidden="true" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
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

      <Dialog open={Boolean(draft)} onOpenChange={(open) => !open && !isSaving && setDraft(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{draft?.id ? "Editar técnico" : "Nuevo técnico"}</DialogTitle>
            <DialogDescription>
              Esta persona aparecerá al asignar quién recibe el material de una salida.
            </DialogDescription>
          </DialogHeader>

          {draft ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="technician-name">
                  Nombre completo
                  <RequiredMark />
                </Label>
                <Input
                  id="technician-name"
                  value={draft.full_name}
                  onChange={(event) =>
                    setDraft({ ...draft, full_name: event.target.value })
                  }
                  className="min-h-[44px]"
                  autoComplete="name"
                />
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="technician-document">
                    Cédula
                    <RequiredMark />
                  </Label>
                  <Input
                    id="technician-document"
                    value={draft.document_id}
                    onChange={(event) =>
                      setDraft({ ...draft, document_id: event.target.value })
                    }
                    className="min-h-[44px] font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="technician-phone">Teléfono</Label>
                  <div className="relative">
                    <Phone
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <Input
                      id="technician-phone"
                      value={draft.phone}
                      onChange={(event) =>
                        setDraft({ ...draft, phone: event.target.value })
                      }
                      className="min-h-[44px] pl-9"
                      autoComplete="tel"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="technician-branch">
                  {terms.branch}
                  <RequiredMark />
                </Label>
                <Select
                  value={draft.branch_id}
                  onValueChange={(value) => setDraft({ ...draft, branch_id: value })}
                  disabled={Boolean(lockedBranchId)}
                >
                  <SelectTrigger id="technician-branch" className="min-h-[44px]">
                    <SelectValue placeholder="Seleccione la sede" />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter((branch) => !lockedBranchId || branch.id === lockedBranchId)
                      .map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDraft(null)}
              disabled={isSaving}
            >
              {buttons.cancel}
            </Button>
            <Button
              type="button"
              onClick={() => {
                void handleSave();
              }}
              disabled={isSaving}
              className="min-h-[44px] gap-2"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {buttons.saveTechnician}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
