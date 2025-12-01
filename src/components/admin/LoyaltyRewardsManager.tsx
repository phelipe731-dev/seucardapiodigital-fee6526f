import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Gift, TrendingUp } from "lucide-react";

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: "discount" | "product" | "free_delivery";
  reward_value: number | null;
  product_id: string | null;
  is_active: boolean;
  display_order: number;
}

interface Product {
  id: string;
  name: string;
}

interface LoyaltyRewardsManagerProps {
  restaurantId: string;
}

export default function LoyaltyRewardsManager({ restaurantId }: LoyaltyRewardsManagerProps) {
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<LoyaltyReward | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    points_required: "",
    reward_type: "discount" as "discount" | "product" | "free_delivery",
    reward_value: "",
    product_id: "",
    is_active: true,
    display_order: "0",
  });

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  const loadData = async () => {
    try {
      const [rewardsResult, productsResult] = await Promise.all([
        supabase
          .from("loyalty_rewards")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .order("display_order", { ascending: true }),
        supabase
          .from("products")
          .select("id, name")
          .eq("restaurant_id", restaurantId)
          .eq("is_active", true)
      ]);

      if (rewardsResult.error) throw rewardsResult.error;
      if (productsResult.error) throw productsResult.error;

      setRewards((rewardsResult.data || []) as LoyaltyReward[]);
      setProducts(productsResult.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const rewardData = {
        restaurant_id: restaurantId,
        name: formData.name,
        description: formData.description || null,
        points_required: parseInt(formData.points_required),
        reward_type: formData.reward_type,
        reward_value: formData.reward_value ? parseFloat(formData.reward_value) : null,
        product_id: formData.product_id || null,
        is_active: formData.is_active,
        display_order: parseInt(formData.display_order),
      };

      if (editingReward) {
        const { error } = await supabase
          .from("loyalty_rewards")
          .update(rewardData)
          .eq("id", editingReward.id);

        if (error) throw error;
        toast.success("Recompensa atualizada com sucesso!");
      } else {
        const { error } = await supabase
          .from("loyalty_rewards")
          .insert([rewardData]);

        if (error) throw error;
        toast.success("Recompensa criada com sucesso!");
      }

      resetForm();
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error("Erro ao salvar recompensa: " + error.message);
    }
  };

  const handleEdit = (reward: LoyaltyReward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description || "",
      points_required: reward.points_required.toString(),
      reward_type: reward.reward_type,
      reward_value: reward.reward_value?.toString() || "",
      product_id: reward.product_id || "",
      is_active: reward.is_active,
      display_order: reward.display_order.toString(),
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta recompensa?")) return;

    try {
      const { error } = await supabase
        .from("loyalty_rewards")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Recompensa excluída com sucesso!");
      loadData();
    } catch (error: any) {
      toast.error("Erro ao excluir recompensa: " + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      points_required: "",
      reward_type: "discount",
      reward_value: "",
      product_id: "",
      is_active: true,
      display_order: "0",
    });
    setEditingReward(null);
  };

  const getRewardTypeLabel = (type: string) => {
    const types = {
      discount: "Desconto em Dinheiro",
      product: "Produto Grátis",
      free_delivery: "Frete Grátis",
    };
    return types[type as keyof typeof types] || type;
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Recompensas de Fidelidade</h2>
          <p className="text-muted-foreground">Gerencie as recompensas disponíveis para resgate</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nova Recompensa
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingReward ? "Editar Recompensa" : "Criar Nova Recompensa"}</DialogTitle>
              <DialogDescription>
                Configure os detalhes da recompensa de fidelidade
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Recompensa *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Desconto de R$ 10"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição da recompensa"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="points_required">Pontos Necessários *</Label>
                  <Input
                    id="points_required"
                    type="number"
                    value={formData.points_required}
                    onChange={(e) => setFormData({ ...formData, points_required: e.target.value })}
                    placeholder="Ex: 100"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reward_type">Tipo de Recompensa *</Label>
                  <Select value={formData.reward_type} onValueChange={(value: any) => setFormData({ ...formData, reward_type: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="discount">Desconto em Dinheiro</SelectItem>
                      <SelectItem value="product">Produto Grátis</SelectItem>
                      <SelectItem value="free_delivery">Frete Grátis</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {formData.reward_type === "discount" && (
                <div className="space-y-2">
                  <Label htmlFor="reward_value">Valor do Desconto (R$) *</Label>
                  <Input
                    id="reward_value"
                    type="number"
                    step="0.01"
                    value={formData.reward_value}
                    onChange={(e) => setFormData({ ...formData, reward_value: e.target.value })}
                    placeholder="Ex: 10.00"
                    required
                  />
                </div>
              )}

              {formData.reward_type === "product" && (
                <div className="space-y-2">
                  <Label htmlFor="product_id">Produto *</Label>
                  <Select value={formData.product_id} onValueChange={(value) => setFormData({ ...formData, product_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um produto" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="display_order">Ordem de Exibição</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Recompensa Ativa</Label>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingReward ? "Atualizar" : "Criar"} Recompensa
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rewards.map((reward) => (
          <Card key={reward.id} className={!reward.is_active ? "opacity-60" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  <span>{reward.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(reward)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(reward.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>{reward.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-bold">{reward.points_required} pontos</span>
              </div>
              <p className="text-muted-foreground">{getRewardTypeLabel(reward.reward_type)}</p>
              {reward.reward_value && (
                <p>Valor: R$ {reward.reward_value.toFixed(2)}</p>
              )}
              <p className={reward.is_active ? "text-green-600" : "text-red-600"}>
                {reward.is_active ? "Ativa" : "Inativa"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {rewards.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma recompensa cadastrada ainda.</p>
            <p className="text-sm text-muted-foreground">Crie recompensas para seus clientes resgatarem!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}