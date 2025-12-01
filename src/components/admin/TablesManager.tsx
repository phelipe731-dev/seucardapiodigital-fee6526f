import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Users } from "lucide-react";

interface Table {
  id: string;
  table_number: string;
  capacity: number;
  location: string;
  status: string;
  is_active: boolean;
}

export default function TablesManager() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [restaurantId, setRestaurantId] = useState<string>("");

  const [formData, setFormData] = useState({
    table_number: "",
    capacity: "",
    location: "internal",
    is_active: true,
  });

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!restaurant) return;
      setRestaurantId(restaurant.id);

      const { data, error } = await supabase
        .from("tables")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("table_number");

      if (error) throw error;
      setTables(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar mesas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const tableData = {
        restaurant_id: restaurantId,
        table_number: formData.table_number.trim(),
        capacity: parseInt(formData.capacity),
        location: formData.location,
        status: "available",
        is_active: formData.is_active,
      };

      if (editingTable) {
        const { error } = await supabase
          .from("tables")
          .update(tableData)
          .eq("id", editingTable.id);

        if (error) throw error;
        toast.success("Mesa atualizada!");
      } else {
        const { error } = await supabase
          .from("tables")
          .insert([tableData]);

        if (error) throw error;
        toast.success("Mesa criada!");
      }

      resetForm();
      setDialogOpen(false);
      loadTables();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const handleEdit = (table: Table) => {
    setEditingTable(table);
    setFormData({
      table_number: table.table_number,
      capacity: table.capacity.toString(),
      location: table.location,
      is_active: table.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta mesa?")) return;

    try {
      const { error } = await supabase
        .from("tables")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Mesa excluída!");
      loadTables();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      table_number: "",
      capacity: "",
      location: "internal",
      is_active: true,
    });
    setEditingTable(null);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      available: { variant: "default", label: "Disponível" },
      occupied: { variant: "secondary", label: "Ocupada" },
      reserved: { variant: "outline", label: "Reservada" },
      maintenance: { variant: "destructive", label: "Manutenção" },
    };
    const config = variants[status] || variants.available;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getLocationLabel = (location: string) => {
    const labels: Record<string, string> = {
      internal: "🏠 Interna",
      external: "🌳 Externa",
      vip: "👑 VIP",
      balcony: "🪟 Sacada",
    };
    return labels[location] || location;
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Mesas</h2>
          <p className="text-muted-foreground">Gerencie as mesas do restaurante</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Mesa
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTable ? "Editar Mesa" : "Nova Mesa"}</DialogTitle>
              <DialogDescription>
                Configure os detalhes da mesa
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="table_number">Número da Mesa *</Label>
                <Input
                  id="table_number"
                  value={formData.table_number}
                  onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                  placeholder="Ex: 1, A1, VIP-1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="capacity">Capacidade (pessoas) *</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Localização *</Label>
                <Select value={formData.location} onValueChange={(value) => setFormData({ ...formData, location: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="internal">🏠 Interna</SelectItem>
                    <SelectItem value="external">🌳 Externa</SelectItem>
                    <SelectItem value="vip">👑 VIP</SelectItem>
                    <SelectItem value="balcony">🪟 Sacada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Mesa Ativa</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingTable ? "Atualizar" : "Criar"} Mesa
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tables.map((table) => (
          <Card key={table.id} className={!table.is_active ? "opacity-60" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-bold">Mesa {table.table_number}</span>
                  {getStatusBadge(table.status)}
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(table)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(table.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{table.capacity} pessoas</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {getLocationLabel(table.location)}
              </div>
              {!table.is_active && (
                <Badge variant="secondary">Inativa</Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {tables.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma mesa cadastrada.</p>
            <p className="text-sm text-muted-foreground">Crie sua primeira mesa!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
