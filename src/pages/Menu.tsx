import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Phone, MapPin } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { CartSheet } from "@/components/CartSheet";
import { toast } from "sonner";

interface Restaurant {
  id: string;
  name: string;
  description: string;
  logo_url: string;
  phone: string;
  whatsapp: string;
  address: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  display_order: number;
}

interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_available: boolean;
  category_id: string;
}

export default function Menu() {
  const { restaurantId } = useParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const { addItem, items } = useCart();

  useEffect(() => {
    loadMenu();
  }, [restaurantId]);

  const loadMenu = async () => {
    try {
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", restaurantId)
        .eq("is_active", true)
        .single();

      if (restaurantError) throw restaurantError;
      setRestaurant(restaurantData);

      const { data: categoriesData, error: categoriesError } = await supabase
        .from("categories")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("display_order");

      if (categoriesError) throw categoriesError;
      setCategories(categoriesData || []);

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true);

      if (productsError) throw productsError;
      setProducts(productsData || []);
    } catch (error: any) {
      toast.error("Erro ao carregar cardápio");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: Product) => {
    if (!product.is_available) {
      toast.error("Produto indisponível no momento");
      return;
    }
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image_url: product.image_url,
    });
    toast.success(`${product.name} adicionado ao carrinho!`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card>
          <CardHeader>
            <CardTitle>Restaurante não encontrado</CardTitle>
            <CardDescription>
              O cardápio que você está procurando não existe ou não está mais disponível.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary text-white sticky top-0 z-40 shadow-elevated">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {restaurant.logo_url && (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-16 h-16 rounded-lg object-cover bg-white"
                />
              )}
              <div>
                <h1 className="text-2xl font-bold">{restaurant.name}</h1>
                {restaurant.description && (
                  <p className="text-sm opacity-90">{restaurant.description}</p>
                )}
              </div>
            </div>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setCartOpen(true)}
              className="relative"
            >
              <ShoppingCart className="mr-2" />
              Carrinho
              {items.length > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-destructive">
                  {items.length}
                </Badge>
              )}
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            {restaurant.phone && (
              <div className="flex items-center gap-2">
                <Phone size={16} />
                <span>{restaurant.phone}</span>
              </div>
            )}
            {restaurant.address && (
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>{restaurant.address}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Menu */}
      <main className="container mx-auto px-4 py-8">
        {categories.map((category) => {
          const categoryProducts = products.filter(
            (p) => p.category_id === category.id
          );

          if (categoryProducts.length === 0) return null;

          return (
            <section key={category.id} className="mb-12">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-foreground">
                  {category.name}
                </h2>
                {category.description && (
                  <p className="text-muted-foreground mt-1">
                    {category.description}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryProducts.map((product) => (
                  <Card
                    key={product.id}
                    className={`overflow-hidden hover:shadow-elevated transition-shadow ${
                      !product.is_available ? "opacity-60" : ""
                    }`}
                  >
                    {product.image_url && (
                      <div className="aspect-video w-full overflow-hidden">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-xl">{product.name}</CardTitle>
                          {product.description && (
                            <CardDescription className="mt-2">
                              {product.description}
                            </CardDescription>
                          )}
                        </div>
                        {!product.is_available && (
                          <Badge variant="destructive" className="ml-2">
                            Esgotado
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">
                          R$ {product.price.toFixed(2)}
                        </span>
                        <Button
                          variant="gradient"
                          onClick={() => handleAddToCart(product)}
                          disabled={!product.is_available}
                        >
                          Adicionar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          );
        })}

        {categories.length === 0 && (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle>Nenhum produto disponível</CardTitle>
              <CardDescription>
                O cardápio ainda está sendo preparado. Volte em breve!
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </main>

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        restaurant={restaurant}
      />
    </div>
  );
}
