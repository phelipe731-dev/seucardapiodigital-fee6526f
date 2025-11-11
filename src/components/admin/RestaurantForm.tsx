import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

export function RestaurantForm() {
  const [loading, setLoading] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    logo_url: "",
    phone: "",
    whatsapp: "",
    address: "",
  });

  useEffect(() => {
    loadRestaurant();
  }, []);

  const loadRestaurant = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setRestaurantId(data.id);
        setFormData({
          name: data.name || "",
          description: data.description || "",
          logo_url: data.logo_url || "",
          phone: data.phone || "",
          whatsapp: data.whatsapp || "",
          address: data.address || "",
        });
      }
    } catch (error: any) {
      console.error("Erro ao carregar restaurante:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      if (restaurantId) {
        const { error } = await supabase
          .from("restaurants")
          .update(formData)
          .eq("id", restaurantId);

        if (error) throw error;
        toast.success("Restaurante atualizado com sucesso!");
      } else {
        const { data, error } = await supabase
          .from("restaurants")
          .insert([{ ...formData, owner_id: user.id }])
          .select()
          .single();

        if (error) throw error;
        setRestaurantId(data.id);
        toast.success("Restaurante criado com sucesso!");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar restaurante");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Informações do Restaurante</CardTitle>
        <CardDescription>
          Configure as informações básicas do seu restaurante
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome do Restaurante *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="logo_url">URL da Logo</Label>
              <Input
                id="logo_url"
                type="url"
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="(00) 0000-0000"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp (com código do país) *</Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="5511999999999"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <Button type="submit" variant="gradient" disabled={loading} className="w-full md:w-auto">
            {loading ? "Salvando..." : restaurantId ? "Atualizar" : "Criar Restaurante"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
