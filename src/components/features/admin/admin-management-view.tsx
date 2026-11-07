"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Boxes,
  Building2,
  CheckCircle2,
  Loader2,
  Plus,
  ShieldCheck,
  UserCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { createBranchAction, createItemAction } from "@/actions/admin";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import type { Branch, Item, UnitOfMeasure } from "@/types/inventory";

interface AdminManagementViewProps {
  branches: Branch[];
  items: Item[];
}

export const AdminManagementView: React.FC<AdminManagementViewProps> = ({
  branches,
  items,
}) => {
  const router = useRouter();

  // New branch state
  const [branchCode, setBranchCode] = React.useState<string>("");
  const [branchName, setBranchName] = React.useState<string>("");
  const [branchAddress, setBranchAddress] = React.useState<string>("");
  const [branchPhone, setBranchPhone] = React.useState<string>("");
  const [isCreatingBranch, setIsCreatingBranch] =
    React.useState<boolean>(false);

  // New item state
  const [itemSku, setItemSku] = React.useState<string>("");
  const [itemName, setItemName] = React.useState<string>("");
  const [itemCategory, setItemCategory] = React.useState<string>("Fibra Óptica");
  const [itemUnit, setItemUnit] = React.useState<UnitOfMeasure>("metros");
  const [itemIsSerialized, setItemIsSerialized] =
    React.useState<boolean>(false);
  const [itemMinStock, setItemMinStock] = React.useState<number>(10);
  const [isCreatingItem, setIsCreatingItem] = React.useState<boolean>(false);

  const handleCreateBranch = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!branchCode || !branchName) {
      toast.error("El código y nombre de sede son obligatorios");
      return;
    }

    setIsCreatingBranch(true);
    try {
      const res = await createBranchAction({
        code: branchCode,
        name: branchName,
        address: branchAddress,
        phone: branchPhone,
      });

      if (!res.success) {
        toast.error("Error al crear sucursal", { description: res.error });
        setIsCreatingBranch(false);
        return;
      }

      toast.success("Sucursal creada exitosamente");
      setBranchCode("");
      setBranchName("");
      setBranchAddress("");
      setBranchPhone("");
      router.refresh();
    } catch {
      toast.error("Error inesperado al conectar con el servidor");
    } finally {
      setIsCreatingBranch(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!itemSku || !itemName) {
      toast.error("El SKU y nombre de ítem son obligatorios");
      return;
    }

    setIsCreatingItem(true);
    try {
      const res = await createItemAction({
        sku: itemSku,
        name: itemName,
        category: itemCategory,
        unit: itemUnit,
        is_serialized: itemIsSerialized,
        min_stock: itemMinStock,
      });

      if (!res.success) {
        toast.error("Error al crear ítem", { description: res.error });
        setIsCreatingItem(false);
        return;
      }

      toast.success("Ítem agregado al catálogo exitosamente");
      setItemSku("");
      setItemName("");
      setItemMinStock(10);
      router.refresh();
    } catch {
      toast.error("Error inesperado");
    } finally {
      setIsCreatingItem(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" aria-hidden="true" />
          Administración Global
        </h1>
        <p className="text-sm text-muted-foreground">
          Gestión de sucursales, catálogo maestro de materiales y asignación de
          roles.
        </p>
      </div>

      <Tabs defaultValue="branches" className="space-y-4">
        <TabsList className="grid w-full sm:w-[480px] grid-cols-2">
          <TabsTrigger value="branches" className="gap-2">
            <Building2 className="h-4 w-4" />
            Sucursales
          </TabsTrigger>
          <TabsTrigger value="catalog" className="gap-2">
            <Boxes className="h-4 w-4" />
            Catálogo Maestro
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Branches */}
        <TabsContent value="branches" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Branch Form */}
            <Card className="border shadow-sm">
              <form onSubmit={handleCreateBranch}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-primary" />
                    Registrar Nueva Sucursal
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Crea una nueva sede para asignarle almacenes y cuadrillas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="branch-code" className="text-xs">
                      Código Único (3 letras)
                    </Label>
                    <Input
                      id="branch-code"
                      placeholder="Ej. BAR"
                      maxLength={10}
                      value={branchCode}
                      onChange={(e) => setBranchCode(e.target.value.toUpperCase())}
                      className="font-mono min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="branch-name" className="text-xs">
                      Nombre de la Sede
                    </Label>
                    <Input
                      id="branch-name"
                      placeholder="Ej. Sucursal Barquisimeto"
                      value={branchName}
                      onChange={(e) => setBranchName(e.target.value)}
                      className="min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="branch-addr" className="text-xs">
                      Dirección (opcional)
                    </Label>
                    <Input
                      id="branch-addr"
                      placeholder="Av. Venezuela con Calle 20"
                      value={branchAddress}
                      onChange={(e) => setBranchAddress(e.target.value)}
                      className="min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="branch-phone" className="text-xs">
                      Teléfono de Contacto
                    </Label>
                    <Input
                      id="branch-phone"
                      placeholder="+58 251 200 4400"
                      value={branchPhone}
                      onChange={(e) => setBranchPhone(e.target.value)}
                      className="min-h-[44px]"
                    />
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t">
                  <Button
                    type="submit"
                    disabled={isCreatingBranch}
                    className="w-full gap-2 font-semibold min-h-[44px]"
                  >
                    {isCreatingBranch ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Crear Sucursal
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Branches List */}
            <Card className="border shadow-sm lg:col-span-2 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Sedes Activas</CardTitle>
                <CardDescription className="text-xs">
                  Sucursales operativas de Tv Star Satellite, C.A.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Código</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Dirección / Teléfono</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-mono font-bold text-xs">
                          {b.code}
                        </TableCell>
                        <TableCell className="font-semibold text-sm">
                          {b.name}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div>{b.address || "Sin dirección"}</div>
                          <div>{b.phone}</div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="success">Operativa</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tab 2: Catalog Items */}
        <TabsContent value="catalog" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Create Item Form */}
            <Card className="border shadow-sm">
              <form onSubmit={handleCreateItem}>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Boxes className="h-4 w-4 text-primary" />
                    Registrar Ítem en Catálogo
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Añade un nuevo material o equipo para control de stock.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="item-sku" className="text-xs">
                      Código SKU
                    </Label>
                    <Input
                      id="item-sku"
                      placeholder="Ej. SPL-PLC-1X16"
                      value={itemSku}
                      onChange={(e) => setItemSku(e.target.value.toUpperCase())}
                      className="font-mono min-h-[44px]"
                    />
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="item-name" className="text-xs">
                      Descripción del Material
                    </Label>
                    <Input
                      id="item-name"
                      placeholder="Ej. Splitter PLC 1x16 SC/APC"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className="min-h-[44px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Categoría</Label>
                      <select
                        value={itemCategory}
                        onChange={(e) => setItemCategory(e.target.value)}
                        className="w-full h-11 rounded-md border border-input bg-background px-2 text-xs text-foreground min-h-[44px]"
                      >
                        <option value="Fibra Óptica">Fibra Óptica</option>
                        <option value="Equipos Activos">Equipos Activos</option>
                        <option value="Ferretería y Pasivos">
                          Ferretería y Pasivos
                        </option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Unidad de Medida</Label>
                      <select
                        value={itemUnit}
                        onChange={(e) =>
                          setItemUnit(e.target.value as UnitOfMeasure)
                        }
                        className="w-full h-11 rounded-md border border-input bg-background px-2 text-xs text-foreground min-h-[44px]"
                      >
                        <option value="metros">metros</option>
                        <option value="bobinas">bobinas</option>
                        <option value="unidades">unidades</option>
                        <option value="kilogramos">kilogramos</option>
                        <option value="pares">pares</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <Label htmlFor="min-stock" className="text-xs">
                        Stock Mínimo
                      </Label>
                      <Input
                        id="min-stock"
                        type="number"
                        min="0"
                        value={itemMinStock}
                        onChange={(e) =>
                          setItemMinStock(parseFloat(e.target.value) || 0)
                        }
                        className="min-h-[44px] text-right font-mono"
                      />
                    </div>

                    <div className="flex flex-col justify-end pb-2">
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="checkbox"
                          checked={itemIsSerialized}
                          onChange={(e) =>
                            setItemIsSerialized(e.target.checked)
                          }
                          className="h-4 w-4 rounded border-input text-primary"
                        />
                        <span>¿Es serializado? (ONU/Router)</span>
                      </label>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="pt-2 border-t">
                  <Button
                    type="submit"
                    disabled={isCreatingItem}
                    className="w-full gap-2 font-semibold min-h-[44px]"
                  >
                    {isCreatingItem ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Añadir al Catálogo
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Items List */}
            <Card className="border shadow-sm lg:col-span-2 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Catálogo Actual</CardTitle>
                <CardDescription className="text-xs">
                  {items.length} ítems registrados en el sistema.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-center">Unidad</TableHead>
                      <TableHead className="text-right">Mínimo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono font-bold text-xs">
                          {i.sku}
                        </TableCell>
                        <TableCell className="font-medium text-sm">
                          {i.name}
                          {i.is_serialized && (
                            <Badge variant="secondary" className="ml-2 text-[10px]">
                              Serial/MAC
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {i.category}
                        </TableCell>
                        <TableCell className="text-center text-xs">
                          <Badge variant="outline">{i.unit}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-xs">
                          {i.min_stock}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
