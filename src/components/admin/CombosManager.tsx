import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Pencil, Trash2, Plus, Package, X } from "lucide-react";

interface Combo {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  original_price: number;
  combo_price: number;
  is_active: boolean;
  available_days: string[];
  available_start_time: string | null;
  available_end_time: string | null;
}

interface Product {
  id: string;
  name: string;
  price: number;
}

interface ComboItem {
  product_id: string;
  quantity: number;
}

interface CombosManagerProps {
  restaurantId: string;
}

const DAYS_OF_WEEK = [
  { value: "monday", label: "Segunda" },
  { value: "tuesday", label: "Terça" },
  { value: "wednesday", label: "Quarta" },
  { value: "thursday", label: "Quinta" },
  { value: "friday", label: "Sexta" },
  { value: "saturday", label: "Sábado" },
  { value: "sunday", label: "Domingo" },
];

export default function CombosManager({ restaurantId }: CombosManagerProps) {
  const [combos, setCombos] = useState<Combo[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCombo, setEditingCombo] = useState<Combo | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    image_url: "",
    combo_price: "",
    available_days: DAYS_OF_WEEK.map(d => d.value),
    available_start_time: "",
    available_end_time: "",
    is_active: true,
  });

  const [comboItems, setComboItems] = useState<ComboItem[]>([]);

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  const loadData = async () => {
    try {
      const [combosResult, productsResult] = await Promise.all([
        supabase
          .from("combos")
          .select("*")
          .eq("restaurant_id", restaurantId)
          .order("display_order", { ascending: true }),
        supabase
          .from("products")
          .select("id, name, price")
          .eq("restaurant_id", restaurantId)
          .eq("is_active", true)
      ]);

      if (combosResult.error) throw combosResult.error;
      if (productsResult.error) throw productsResult.error;

      setCombos(combosResult.data || []);
      setProducts(productsResult.data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadComboItems = async (comboId: string) => {
    try {
      const { data, error } = await supabase
        .from("combo_items")
        .select("product_id, quantity")
        .eq("combo_id", comboId);

      if (error) throw error;
      setComboItems(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar itens do combo: " + error.message);
    }
  };

  const calculateOriginalPrice = () => {
    return comboItems.reduce((total, item) => {
      const product = products.find(p => p.id === item.product_id);
      return total + (product ? product.price * item.quantity : 0);
    }, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (comboItems.length === 0) {
      toast.error("Adicione pelo menos um produto ao combo");
      return;
    }

    try {
      const originalPrice = calculateOriginalPrice();
      const comboData = {
        restaurant_id: restaurantId,
        name: formData.name,
        description: formData.description || null,
        image_url: formData.image_url || null,
        original_price: originalPrice,
        combo_price: parseFloat(formData.combo_price),
        available_days: formData.available_days,
        available_start_time: formData.available_start_time || null,
        available_end_time: formData.available_end_time || null,
        is_active: formData.is_active,
      };

      let comboId: string;

      if (editingCombo) {
        const { error } = await supabase
          .from("combos")
          .update(comboData)
          .eq("id", editingCombo.id);

        if (error) throw error;
        comboId = editingCombo.id;

        // Deletar itens antigos
        await supabase.from("combo_items").delete().eq("combo_id", comboId);
      } else {
        const { data, error } = await supabase
          .from("combos")
          .insert([comboData])
          .select()
          .single();

        if (error) throw error;
        comboId = data.id;
      }

      // Inserir novos itens
      const items = comboItems.map(item => ({
        combo_id: comboId,
        product_id: item.product_id,
        quantity: item.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("combo_items")
        .insert(items);

      if (itemsError) throw itemsError;

      toast.success(editingCombo ? "Combo atualizado com sucesso!" : "Combo criado com sucesso!");
      resetForm();
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error("Erro ao salvar combo: " + error.message);
    }
  };

  const handleEdit = async (combo: Combo) => {
    setEditingCombo(combo);
    setFormData({
      name: combo.name,
      description: combo.description || "",
      image_url: combo.image_url || "",
      combo_price: combo.combo_price.toString(),
      available_days: combo.available_days || DAYS_OF_WEEK.map(d => d.value),
      available_start_time: combo.available_start_time || "",
      available_end_time: combo.available_end_time || "",
      is_active: combo.is_active,
    });
    await loadComboItems(combo.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este combo?")) return;

    try {
      const { error } = await supabase.from("combos").delete().eq("id", id);
      if (error) throw error;
      toast.success("Combo excluído com sucesso!");
      loadData();
    } catch (error: any) {
      toast.error("Erro ao excluir combo: " + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      image_url: "",
      combo_price: "",
      available_days: DAYS_OF_WEEK.map(d => d.value),
      available_start_time: "",
      available_end_time: "",
      is_active: true,
    });
    setComboItems([]);
    setEditingCombo(null);
  };

  const addProductToCombo = (productId: string) => {
    setComboItems([...comboItems, { product_id: productId, quantity: 1 }]);
  };

  const removeProductFromCombo = (index: number) => {
    setComboItems(comboItems.filter((_, i) => i !== index));
  };

  const updateProductQuantity = (index: number, quantity: number) => {
    const updated = [...comboItems];
    updated[index].quantity = quantity;
    setComboItems(updated);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Combos e Promoções</h2>
          <p className="text-muted-foreground">Crie combos de produtos com preços especiais</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Novo Combo
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingCombo ? "Editar Combo" : "Criar Novo Combo"}</DialogTitle>
              <DialogDescription>Configure os detalhes e produtos do combo</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Combo *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Combo Família"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descrição do combo"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="image_url">URL da Imagem</Label>
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-3">
                <Label>Produtos do Combo *</Label>
                <div className="border rounded-lg p-4 space-y-2">
                  {comboItems.map((item, index) => {
                    const product = products.find(p => p.id === item.product_id);
                    return (
                      <div key={index} className="flex items-center gap-2">
                        <span className="flex-1">{product?.name}</span>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateProductQuantity(index, parseInt(e.target.value))}
                          className="w-20"
                        />
                        <span className="w-24 text-right">R$ {((product?.price || 0) * item.quantity).toFixed(2)}</span>
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeProductFromCombo(index)}>
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                  <select
                    className="w-full p-2 border rounded"
                    onChange={(e) => {
                      if (e.target.value) {
                        addProductToCombo(e.target.value);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">+ Adicionar produto</option>
                    {products.filter(p => !comboItems.find(i => i.product_id === p.id)).map(p => (
                      <option key={p.id} value={p.id}>{p.name} - R$ {p.price.toFixed(2)}</option>
                    ))}
                  </select>
                  {comboItems.length > 0 && (
                    <div className="pt-2 border-t font-bold">
                      Total Original: R$ {calculateOriginalPrice().toFixed(2)}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="combo_price">Preço do Combo (R$) *</Label>
                <Input
                  id="combo_price"
                  type="number"
                  step="0.01"
                  value={formData.combo_price}
                  onChange={(e) => setFormData({ ...formData, combo_price: e.target.value })}
                  placeholder="0.00"
                  required
                />
                {formData.combo_price && comboItems.length > 0 && (
                  <p className="text-sm text-green-600">
                    Economia: R$ {(calculateOriginalPrice() - parseFloat(formData.combo_price)).toFixed(2)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Disponível nos Dias</Label>
                <div className="grid grid-cols-3 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={day.value}
                        checked={formData.available_days.includes(day.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setFormData({ ...formData, available_days: [...formData.available_days, day.value] });
                          } else {
                            setFormData({ ...formData, available_days: formData.available_days.filter(d => d !== day.value) });
                          }
                        }}
                      />
                      <Label htmlFor={day.value} className="text-sm">{day.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="available_start_time">Horário Início</Label>
                  <Input
                    id="available_start_time"
                    type="time"
                    value={formData.available_start_time}
                    onChange={(e) => setFormData({ ...formData, available_start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="available_end_time">Horário Fim</Label>
                  <Input
                    id="available_end_time"
                    type="time"
                    value={formData.available_end_time}
                    onChange={(e) => setFormData({ ...formData, available_end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Combo Ativo</Label>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}>
                  Cancelar
                </Button>
                <Button type="submit">{editingCombo ? "Atualizar" : "Criar"} Combo</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {combos.map((combo) => (
          <Card key={combo.id} className={!combo.is_active ? "opacity-60" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <span>{combo.name}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => handleEdit(combo)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(combo.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>{combo.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground line-through">R$ {combo.original_price.toFixed(2)}</span>
                <span className="text-xl font-bold text-green-600">R$ {combo.combo_price.toFixed(2)}</span>
              </div>
              <p className="text-green-600">Economize R$ {(combo.original_price - combo.combo_price).toFixed(2)}</p>
              <p className={combo.is_active ? "text-green-600" : "text-red-600"}>
                {combo.is_active ? "Ativo" : "Inativo"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {combos.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum combo cadastrado ainda.</p>
            <p className="text-sm text-muted-foreground">Crie combos atrativos para aumentar suas vendas!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}