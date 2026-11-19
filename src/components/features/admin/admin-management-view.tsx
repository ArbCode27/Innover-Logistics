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

import { createBranchAction, createItemAction, updateItemAction } from "@/actions/admin";
import { Button } from "@/components/ui/button";
import { buttons, terms } from "@/lib/glossary";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  const [branchState, setBranchState] = React.useState<string>("");
  const [branchMunicipality, setBranchMunicipality] = React.useState<string>("");
  const [branchFranchise, setBranchFranchise] = React.useState<string>("");
  const [isMainBranch, setIsMainBranch] = React.useState<boolean>(false);
  const [parentBranchId, setParentBranchId] = React.useState<string>("none");
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
  const [catalogSearch, setCatalogSearch] = React.useState("");
  const [editingItem, setEditingItem] = React.useState<Item | null>(null);
  const [editName, setEditName] = React.useState("");
  const [editCategory, setEditCategory] = React.useState("");
  const [editUnit, setEditUnit] = React.useState<UnitOfMeasure>("unidades");
  const [editMinStock, setEditMinStock] = React.useState(0);
  const [isSavingItem, setIsSavingItem] = React.useState(false);

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
        is_main: isMainBranch,
        parent_branch_id: parentBranchId !== "none" ? parentBranchId : null,
        state: branchState,
        municipality: branchMunicipality,
        franchise_name: branchFranchise,
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
      setBranchState("");
      setBranchMunicipality("");
      setBranchFranchise("");
      setIsMainBranch(false);
      setParentBranchId("none");
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
      toast.error("El código y el nombre son obligatorios. Escríbelos para agregar el producto.");
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
        toast.error("No se pudo agregar el producto. Revisa el código: si ya existe, usa otro.", {
          description: res.error,
        });
        setIsCreatingItem(false);
        return;
      }

      toast.success("Producto agregado");
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

  const handleOpenEdit = (item: Item): void => {
    setEditingItem(item);
    setEditName(item.name);
    setEditCategory(item.category);
    setEditUnit(item.unit);
    setEditMinStock(Number(item.min_stock));
  };

  const handleSaveItem = async (): Promise<void> => {
    if (!editingItem) return;
    if (!editName.trim()) {
      toast.error("El nombre es obligatorio. Escríbelo para guardar los cambios.");
      return;
    }
    setIsSavingItem(true);
    try {
      const res = await updateItemAction({
        id: editingItem.id,
        name: editName,
        category: editCategory,
        unit: editUnit,
        min_stock: editMinStock,
      });
      if (!res.success) {
        toast.error(res.error || "No se pudo guardar el producto.");
        return;
      }
      toast.success("Cambios guardados");
      setEditingItem(null);
      router.refresh();
    } finally {
      setIsSavingItem(false);
    }
  };

  const visibleItems = items.filter((item) => {
    const query = catalogSearch.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
          <ShieldCheck className="h-7 w-7 text-primary" aria-hidden="true" />
          Administración Global
        </h1>
        <p className="text-sm text-muted-foreground">
          Sedes y productos. El código de un producto no se cambia después de crearlo.
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
            Productos
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

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="branch-state" className="text-xs">
                        Estado
                      </Label>
                      <Input
                        id="branch-state"
                        placeholder="Ej. Lara"
                        value={branchState}
                        onChange={(e) => setBranchState(e.target.value)}
                        className="min-h-[44px]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="branch-mun" className="text-xs">
                        Municipio
                      </Label>
                      <Input
                        id="branch-mun"
                        placeholder="Ej. Iribarren"
                        value={branchMunicipality}
                        onChange={(e) => setBranchMunicipality(e.target.value)}
                        className="min-h-[44px]"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="branch-franchise" className="text-xs">
                      Franquicia / Zona Comercial
                    </Label>
                    <Input
                      id="branch-franchise"
                      placeholder="Ej. Tv Star Centro-Occidente"
                      value={branchFranchise}
                      onChange={(e) => setBranchFranchise(e.target.value)}
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

                  {/* Jerarquía: Sede Matriz vs Sede Hija */}
                  <div className="pt-2 border-t space-y-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is-main-branch"
                        checked={isMainBranch}
                        onCheckedChange={(checked) => {
                          setIsMainBranch(Boolean(checked));
                          if (checked) setParentBranchId("none");
                        }}
                      />
                      <label
                        htmlFor="is-main-branch"
                        className="text-xs font-semibold cursor-pointer select-none leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        ¿Es Sede Matriz / Distribuidor Central?
                      </label>
                    </div>

                    {!isMainBranch && (
                      <div className="space-y-1 pl-1">
                        <Label htmlFor="parent-branch-select" className="text-xs text-muted-foreground">
                          Sede Matriz Administradora (Padre)
                        </Label>
                        <Select value={parentBranchId} onValueChange={setParentBranchId}>
                          <SelectTrigger id="parent-branch-select" className="min-h-[44px]">
                            <SelectValue placeholder="Seleccionar sede matriz..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sin sede matriz (Independiente)</SelectItem>
                            {branches.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                {b.name} ({b.code}) {b.is_main ? "• Matriz Principal" : ""}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
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
                      <TableHead>Nombre / Ubicación</TableHead>
                      <TableHead>Tipo / Dependencia</TableHead>
                      <TableHead>Dirección / Teléfono</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {branches.map((b) => {
                      const parent = branches.find((p) => p.id === b.parent_branch_id);
                      return (
                        <TableRow key={b.id}>
                          <TableCell className="font-mono font-bold text-xs">
                            {b.code}
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-sm">{b.name}</div>
                            {(b.state || b.municipality) && (
                              <div className="text-xs text-muted-foreground">
                                {b.municipality ? `${b.municipality}, ` : ""}{b.state || ""}
                                {b.franchise_name ? ` • ${b.franchise_name}` : ""}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            {b.is_main ? (
                              <Badge variant="default" className="bg-primary/90 text-xs">
                                Matriz Principal
                              </Badge>
                            ) : parent ? (
                              <div className="space-y-0.5">
                                <Badge variant="secondary" className="text-xs">
                                  Sede Hija
                                </Badge>
                                <div className="text-[11px] text-muted-foreground">
                                  Matriz: {parent.name}
                                </div>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-xs">
                                Sucursal
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            <div>{b.address || "Sin dirección"}</div>
                            <div>{b.phone}</div>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="success">Operativa</Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
                    {buttons.addProduct}
                  </CardTitle>
                  <CardDescription>
                    El código no se podrá cambiar después. Los campos vacíos no se guardan.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="item-sku" className="text-xs">
                      {terms.code} *
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
                      Nombre del producto *
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
                      <Select
                        value={itemCategory}
                        onValueChange={(val) => setItemCategory(val)}
                      >
                        <SelectTrigger className="min-h-[44px]">
                          <SelectValue placeholder="Categoría" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Equipos Activos">Equipos Activos (ONUs / Routers)</SelectItem>
                          <SelectItem value="Fibra Óptica">Fibra Óptica</SelectItem>
                          <SelectItem value="Ferretería y Pasivos">Ferretería y Pasivos</SelectItem>
                          <SelectItem value="Herramientas">Herramientas de Almacén</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Unidad de Medida</Label>
                      <Select
                        value={itemUnit}
                        onValueChange={(val) => setItemUnit(val as UnitOfMeasure)}
                      >
                        <SelectTrigger className="min-h-[44px]">
                          <SelectValue placeholder="Unidad" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unidades">unidades</SelectItem>
                          <SelectItem value="metros">metros</SelectItem>
                          <SelectItem value="bobinas">bobinas</SelectItem>
                          <SelectItem value="kilogramos">kilogramos</SelectItem>
                          <SelectItem value="pares">pares</SelectItem>
                        </SelectContent>
                      </Select>
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

                    <div className="flex flex-col justify-end pb-3">
                      <label className="flex items-center gap-2 text-xs cursor-pointer select-none">
                        <Checkbox
                          checked={itemIsSerialized}
                          onCheckedChange={(checked) =>
                            setItemIsSerialized(!!checked)
                          }
                        />
                        <span>Lleva número de serie</span>
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
                        {buttons.addProduct}
                      </>
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Card>

            {/* Items List */}
            <Card className="border shadow-sm lg:col-span-2 overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">{terms.products}</CardTitle>
                <CardDescription>
                  {items.length} productos. El código no se edita.
                </CardDescription>
                <Input
                  value={catalogSearch}
                  onChange={(event) => setCatalogSearch(event.target.value)}
                  placeholder="Buscar por nombre o código"
                  aria-label="Buscar producto"
                  className="mt-3 min-h-[44px]"
                />
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{terms.code}</TableHead>
                      <TableHead>{terms.product}</TableHead>
                      <TableHead>{terms.category}</TableHead>
                      <TableHead className="text-center">{terms.unit}</TableHead>
                      <TableHead className="text-right">{terms.minimum}</TableHead>
                      <TableHead className="text-right">Acción</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleItems.map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-mono text-xs font-bold">
                          {i.sku}
                        </TableCell>
                        <TableCell className="text-sm font-medium">
                          {i.name}
                          {i.is_serialized ? (
                            <Badge variant="secondary" className="ml-2">
                              Con serie
                            </Badge>
                          ) : null}
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
                        <TableCell className="text-right">
                          <Button type="button" variant="outline" size="sm" onClick={() => handleOpenEdit(i)}>
                            Editar
                          </Button>
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
      <Dialog open={Boolean(editingItem)} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Guardar cambios de {editingItem?.sku}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="edit-name">Nombre *</Label>
              <Input id="edit-name" value={editName} onChange={(event) => setEditName(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-category">{terms.category}</Label>
              <Input id="edit-category" value={editCategory} onChange={(event) => setEditCategory(event.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>{terms.unit}</Label>
              <Select value={editUnit} onValueChange={(value) => setEditUnit(value as UnitOfMeasure)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unidades">Unidades</SelectItem>
                  <SelectItem value="metros">Metros</SelectItem>
                  <SelectItem value="bobinas">Bobinas</SelectItem>
                  <SelectItem value="kilogramos">Kilogramos</SelectItem>
                  <SelectItem value="pares">Pares</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-min">{terms.minimum}</Label>
              <Input
                id="edit-min"
                type="number"
                min="0"
                value={editMinStock}
                onChange={(event) => setEditMinStock(Number(event.target.value) || 0)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditingItem(null)}>{buttons.cancel}</Button>
            <Button type="button" onClick={() => void handleSaveItem()} disabled={isSavingItem}>
              {isSavingItem ? "Guardando..." : buttons.saveChanges}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
