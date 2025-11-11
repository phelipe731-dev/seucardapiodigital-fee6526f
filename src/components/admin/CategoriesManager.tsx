import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Edit, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

interface Category {
  id: string;
  name: string;
  description: string;
  display_order: number;
  is_active: boolean;
}

export function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    display_order: 0,
    is_active: true,
  });

  useEffect(() => {
    loadRestaurantAndCategories();
  }, []);

  const loadRestaurantAndCategories = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!restaurant) {
        toast.error("Configure seu restaurante primeiro");
        return;
      }

      setRestaurantId(restaurant.id);

      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("display_order");

      if (error) throw error;
      setCategories(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar categorias:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    setLoading(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from("categories")
          .update(formData)
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Categoria atualizada!");
      } else {
        const { error } = await supabase
          .from("categories")
          .insert([{ ...formData, restaurant_id: restaurantId }]);

        if (error) throw error;
        toast.success("Categoria criada!");
      }

      setDialogOpen(false);
      resetForm();
      loadRestaurantAndCategories();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar categoria");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      description: category.description || "",
      display_order: category.display_order,
      is_active: category.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?")) return;

    try {
      const { error } = await supabase
        .from("categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Categoria excluída!");
      loadRestaurantAndCategories();
    } catch (error: any) {
      toast.error(error.message || "Erro ao excluir categoria");
    }
  };

  const resetForm = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      description: "",
      display_order: categories.length,
      is_active: true,
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Categorias do Cardápio</CardTitle>
            <CardDescription>
              Organize seus produtos em categorias
            </CardDescription>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus size={18} className="mr-2" />
                Nova Categoria
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Editar Categoria" : "Nova Categoria"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
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
                <div className="space-y-2">
                  <Label htmlFor="display_order">Ordem de Exibição</Label>
                  <Input
                    id="display_order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="is_active">Ativa</Label>
                </div>
                <Button type="submit" variant="gradient" disabled={loading} className="w-full">
                  {loading ? "Salvando..." : "Salvar"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {categories.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma categoria cadastrada ainda
          </p>
        ) : (
          <div className="space-y-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-semibold">{category.name}</h3>
                  {category.description && (
                    <p className="text-sm text-muted-foreground">{category.description}</p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="text-muted-foreground">Ordem: {category.display_order}</span>
                    <span className={category.is_active ? "text-green-600" : "text-muted-foreground"}>
                      {category.is_active ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => handleEdit(category)}
                  >
                    <Edit size={18} />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    onClick={() => handleDelete(category.id)}
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
