import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Phone, MapPin, Clock, Search } from "lucide-react";
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
  opening_time: string;
  closing_time: string;
  accepts_delivery: boolean;
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
  const [searchTerm, setSearchTerm] = useState("");
  const { addItem, items } = useCart();

  useEffect(() => {
    loadMenu();
  }, [restaurantId]);

  const isRestaurantOpen = () => {
    if (!restaurant?.opening_time || !restaurant?.closing_time) return true;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [openHour, openMin] = restaurant.opening_time.split(':').map(Number);
    const [closeHour, closeMin] = restaurant.closing_time.split(':').map(Number);
    
    const openingMinutes = openHour * 60 + openMin;
    const closingMinutes = closeHour * 60 + closeMin;
    
    return currentTime >= openingMinutes && currentTime <= closingMinutes;
  };

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
    if (!isRestaurantOpen()) {
      toast.error("Restaurante fechado no momento");
      return;
    }
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

  const filteredProducts = products.filter((product) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      <header className="bg-gradient-primary text-white sticky top-0 z-40 shadow-elevated glass-effect">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {restaurant.logo_url && (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-14 h-14 rounded-xl object-cover bg-white shadow-lg"
                />
              )}
              <div>
                <h1 className="text-xl md:text-2xl font-bold">{restaurant.name}</h1>
                {restaurant.description && (
                  <p className="text-sm opacity-90 hidden md:block">{restaurant.description}</p>
                )}
              </div>
            </div>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setCartOpen(true)}
              className="relative shadow-lg"
            >
              <ShoppingCart className="mr-2" />
              <span className="hidden sm:inline">Carrinho</span>
              {items.length > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-destructive h-6 w-6 flex items-center justify-center p-0">
                  {items.length}
                </Badge>
              )}
            </Button>
          </div>
          
          <div className="space-y-2">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/95 backdrop-blur-sm"
              />
            </div>
            
            {/* Restaurant Info */}
            <div className="flex flex-wrap gap-3 text-sm">
              {restaurant.phone && (
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                  <Phone size={14} />
                  <span>{restaurant.phone}</span>
                </div>
              )}
              {restaurant.address && (
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                  <MapPin size={14} />
                  <span className="line-clamp-1">{restaurant.address}</span>
                </div>
              )}
              {restaurant.opening_time && restaurant.closing_time && (
                <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-lg backdrop-blur-sm">
                  <Clock size={14} />
                  <span>{restaurant.opening_time} - {restaurant.closing_time}</span>
                  <Badge 
                    variant={isRestaurantOpen() ? "default" : "destructive"}
                    className="ml-1"
                  >
                    {isRestaurantOpen() ? "Aberto" : "Fechado"}
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Menu */}
      <main className="container mx-auto px-4 py-8">
        {searchTerm && (
          <div className="mb-6">
            <p className="text-muted-foreground">
              {filteredProducts.length} resultado(s) encontrado(s) para "{searchTerm}"
            </p>
          </div>
        )}
        
        {categories.map((category) => {
          const categoryProducts = (searchTerm ? filteredProducts : products).filter(
            (p) => p.category_id === category.id
          );

          if (categoryProducts.length === 0) return null;

          return (
            <section key={category.id} className="mb-12 animate-fade-in-up">
              <div className="mb-6">
                <h2 className="text-3xl font-bold text-foreground flex items-center gap-3">
                  <span className="h-1 w-12 bg-primary rounded-full"></span>
                  {category.name}
                </h2>
                {category.description && (
                  <p className="text-muted-foreground mt-2 ml-15">
                    {category.description}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {categoryProducts.map((product) => (
                  <Card
                    key={product.id}
                    className={`overflow-hidden hover:shadow-elevated transition-all duration-300 hover:-translate-y-1 ${
                      !product.is_available ? "opacity-60" : ""
                    }`}
                  >
                    {product.image_url && (
                      <div className="aspect-video w-full overflow-hidden relative">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                        />
                        {!product.is_available && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                            <Badge variant="destructive" className="text-lg px-4 py-2">
                              Esgotado
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-xl line-clamp-2">{product.name}</CardTitle>
                      </div>
                      {product.description && (
                        <CardDescription className="line-clamp-2">
                          {product.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-primary">
                          R$ {product.price.toFixed(2)}
                        </span>
                        <Button
                          variant="gradient"
                          onClick={() => handleAddToCart(product)}
                          disabled={!product.is_available || !isRestaurantOpen()}
                          className="shadow-lg"
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

        {categories.length === 0 && !loading && (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle>Nenhum produto disponível</CardTitle>
              <CardDescription>
                O cardápio ainda está sendo preparado. Volte em breve!
              </CardDescription>
            </CardHeader>
          </Card>
        )}
        
        {searchTerm && filteredProducts.length === 0 && (
          <Card className="text-center py-12">
            <CardHeader>
              <CardTitle>Nenhum produto encontrado</CardTitle>
              <CardDescription>
                Tente buscar com outros termos
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
