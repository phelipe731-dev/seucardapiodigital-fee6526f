import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Star, Sparkles, TrendingUp } from "lucide-react";

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_daily_deal: boolean;
  category_id: string;
}

interface Category {
  id: string;
  name: string;
}

export default function DailyDealsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string>("");

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

      if (!restaurant) return;
      setRestaurantId(restaurant.id);

      // Carregar categorias
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("id, name")
        .eq("restaurant_id", restaurant.id)
        .order("name");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      // Carregar produtos
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("id, name, description, price, image_url, is_daily_deal, category_id")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("name");

      if (productsError) throw productsError;
      setProducts(productsData || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleDailyDeal = async (productId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_daily_deal: !currentStatus })
        .eq("id", productId);

      if (error) throw error;

      toast.success(
        !currentStatus
          ? "Produto adicionado às promoções do dia!"
          : "Produto removido das promoções do dia"
      );
      loadData();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const getCategoryName = (categoryId: string) => {
    return categories.find((c) => c.id === categoryId)?.name || "Sem categoria";
  };

  const dailyDeals = products.filter((p) => p.is_daily_deal);
  const availableProducts = products.filter((p) => !p.is_daily_deal);

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header com destaque */}
      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border-2 border-yellow-500/50 rounded-xl p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-yellow-500 p-2 rounded-lg">
            <Star className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Promoções do Dia</h2>
            <p className="text-muted-foreground">
              Destaque produtos especiais que aparecerão no topo do cardápio
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-2 bg-white/80 px-4 py-2 rounded-lg">
            <TrendingUp className="h-4 w-4 text-primary" />
            <span className="font-semibold">{dailyDeals.length} produtos em destaque</span>
          </div>
        </div>
      </div>

      {/* Produtos em destaque */}
      {dailyDeals.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Produtos em Destaque Atual
          </h3>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {dailyDeals.map((product) => (
              <Card key={product.id} className="border-2 border-yellow-500/50 bg-gradient-to-br from-yellow-50 to-orange-50">
                <CardHeader className="pb-3">
                  {product.image_url && (
                    <div className="relative mb-3 overflow-hidden rounded-lg">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-40 object-cover"
                      />
                      <Badge className="absolute top-2 right-2 bg-yellow-500 text-white">
                        <Star className="h-3 w-3 mr-1" />
                        Destaque
                      </Badge>
                    </div>
                  )}
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {product.description || "Sem descrição"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {getCategoryName(product.category_id)}
                    </span>
                    <span className="text-xl font-bold text-primary">
                      R$ {product.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <span className="text-sm font-medium">Em Destaque</span>
                    <Switch
                      checked={product.is_daily_deal}
                      onCheckedChange={() =>
                        toggleDailyDeal(product.id, product.is_daily_deal)
                      }
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Todos os produtos disponíveis */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold">
          Selecionar Produtos para Destaque
        </h3>
        {availableProducts.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">
                Todos os produtos já estão em destaque ou não há produtos cadastrados.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {availableProducts.map((product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-40 object-cover rounded-lg mb-3"
                    />
                  )}
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {product.description || "Sem descrição"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {getCategoryName(product.category_id)}
                    </span>
                    <span className="text-xl font-bold text-primary">
                      R$ {product.price.toFixed(2)}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                    onClick={() =>
                      toggleDailyDeal(product.id, product.is_daily_deal)
                    }
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Adicionar ao Destaque
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
