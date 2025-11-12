import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Trash2, Plus, MapPin } from "lucide-react";
import { toast } from "sonner";

interface DeliveryZone {
  id: string;
  name: string;
  fee: number;
  min_order: number;
  delivery_time: number;
  is_active: boolean;
}

export default function DeliveryZonesManager() {
  const [zones, setZones] = useState<DeliveryZone[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    fee: "",
    min_order: "",
    delivery_time: "45",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (restaurant) {
        setRestaurantId(restaurant.id);
        loadZones(restaurant.id);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadZones = async (restId: string) => {
    const { data, error } = await supabase
      .from("delivery_zones")
      .select("*")
      .eq("restaurant_id", restId)
      .order("name");

    if (error) {
      console.error("Error loading zones:", error);
      return;
    }

    setZones(data || []);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    try {
      const { error } = await supabase.from("delivery_zones").insert({
        restaurant_id: restaurantId,
        name: formData.name,
        fee: Number(formData.fee),
        min_order: Number(formData.min_order) || 0,
        delivery_time: Number(formData.delivery_time),
        is_active: true,
      });

      if (error) throw error;

      toast.success("Zona de entrega adicionada!");
      setFormData({ name: "", fee: "", min_order: "", delivery_time: "45" });
      loadZones(restaurantId);
    } catch (error) {
      console.error("Error adding zone:", error);
      toast.error("Erro ao adicionar zona");
    }
  };

  const handleToggle = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from("delivery_zones")
      .update({ is_active: isActive })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao atualizar zona");
      return;
    }

    if (restaurantId) {
      loadZones(restaurantId);
      toast.success("Zona atualizada!");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Deseja realmente excluir esta zona?")) return;

    const { error } = await supabase
      .from("delivery_zones")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir zona");
      return;
    }

    if (restaurantId) {
      loadZones(restaurantId);
      toast.success("Zona excluída!");
    }
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Adicionar Zona de Entrega
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Zona/Bairro *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Ex: Centro, Vila Maria, etc."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fee">Taxa de Entrega (R$) *</Label>
                <Input
                  id="fee"
                  type="number"
                  step="0.01"
                  value={formData.fee}
                  onChange={(e) =>
                    setFormData({ ...formData, fee: e.target.value })
                  }
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="min_order">Pedido Mínimo (R$)</Label>
                <Input
                  id="min_order"
                  type="number"
                  step="0.01"
                  value={formData.min_order}
                  onChange={(e) =>
                    setFormData({ ...formData, min_order: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="delivery_time">Tempo Estimado (min) *</Label>
                <Input
                  id="delivery_time"
                  type="number"
                  value={formData.delivery_time}
                  onChange={(e) =>
                    setFormData({ ...formData, delivery_time: e.target.value })
                  }
                  placeholder="45"
                  required
                />
              </div>
            </div>
            <Button type="submit" className="w-full md:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Zona
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {zones.map((zone) => (
          <Card key={zone.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{zone.name}</CardTitle>
                  <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                    <p>Taxa: R$ {Number(zone.fee).toFixed(2)}</p>
                    {zone.min_order > 0 && (
                      <p>Mínimo: R$ {Number(zone.min_order).toFixed(2)}</p>
                    )}
                    <p>Tempo: {zone.delivery_time} min</p>
                  </div>
                </div>
                <Badge variant={zone.is_active ? "default" : "secondary"}>
                  {zone.is_active ? "Ativo" : "Inativo"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={zone.is_active}
                  onCheckedChange={(checked) => handleToggle(zone.id, checked)}
                />
                <Label className="text-sm">Ativo</Label>
              </div>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDelete(zone.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {zones.length === 0 && (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Nenhuma zona de entrega cadastrada.
            <br />
            Adicione zonas para calcular o frete automaticamente.
          </p>
        </Card>
      )}
    </div>
  );
}
