import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Phone, MapPin, Clock, Search, Home, Plus, Sparkles } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { CartSheet } from "@/components/CartSheet";
import { toast } from "sonner";
import type { SelectedOption } from "@/contexts/CartContext";

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
  working_days: string[];
  accepts_orders_override: boolean | null;
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

interface OptionItem {
  id: string;
  name: string;
  price: number;
}

interface ProductOption {
  id: string;
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  items: OptionItem[];
}

export default function Menu() {
  const { restaurantId } = useParams();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [loadingOptions, setLoadingOptions] = useState(false);
  const { addItem, items } = useCart();

  useEffect(() => {
    loadMenu();
  }, [restaurantId]);

  const isRestaurantOpen = () => {
    if (!restaurant) return false;
    
    // Check manual override first
    if (restaurant.accepts_orders_override !== null) {
      return restaurant.accepts_orders_override;
    }
    
    // Check if today is a working day
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = daysOfWeek[new Date().getDay()];
    
    if (restaurant.working_days && !restaurant.working_days.includes(today)) {
      return false;
    }
    
    // Check time
    if (!restaurant.opening_time || !restaurant.closing_time) return true;
    
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

  const handleAddToCart = async (product: Product) => {
    if (!isRestaurantOpen()) {
      toast.error("Restaurante fechado no momento");
      return;
    }
    if (!product.is_available) {
      toast.error("Produto indisponível no momento");
      return;
    }

    // Load product options
    setLoadingOptions(true);
    setSelectedProduct(product);
    
    const { data: optionsData, error: optionsError } = await supabase
      .from("product_options")
      .select("*")
      .eq("product_id", product.id)
      .order("display_order");

    if (optionsError) {
      console.error(optionsError);
      // If no options, add directly to cart
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
      });
      toast.success(`${product.name} adicionado ao carrinho!`);
      setLoadingOptions(false);
      return;
    }

    if (!optionsData || optionsData.length === 0) {
      // If no options, add directly to cart
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
      });
      toast.success(`${product.name} adicionado ao carrinho!`);
      setLoadingOptions(false);
      return;
    }

    // Load option items
    const optionsWithItems = await Promise.all(
      optionsData.map(async (option) => {
        const { data: items } = await supabase
          .from("product_option_items")
          .select("*")
          .eq("option_id", option.id)
          .order("display_order");

        return { ...option, items: items || [] };
      })
    );

    setProductOptions(optionsWithItems);
    setSelectedOptions({});
    setOptionsDialogOpen(true);
    setLoadingOptions(false);
  };

  const handleOptionChange = (optionId: string, itemId: string, checked: boolean) => {
    setSelectedOptions(prev => {
      const current = prev[optionId] || [];
      const option = productOptions.find(o => o.id === optionId);
      
      if (!option) return prev;
      
      if (checked) {
        // Check max selections
        if (current.length >= option.max_selections) {
          if (option.max_selections === 1) {
            return { ...prev, [optionId]: [itemId] };
          }
          toast.error(`Máximo de ${option.max_selections} seleções`);
          return prev;
        }
        return { ...prev, [optionId]: [...current, itemId] };
      } else {
        return { ...prev, [optionId]: current.filter(id => id !== itemId) };
      }
    });
  };

  const handleConfirmOptions = () => {
    if (!selectedProduct) return;

    // Validate required options
    for (const option of productOptions) {
      const selected = selectedOptions[option.id] || [];
      
      if (option.is_required && selected.length < option.min_selections) {
        toast.error(`"${option.name}" é obrigatório (mínimo ${option.min_selections})`);
        return;
      }
      
      if (selected.length < option.min_selections) {
        toast.error(`Selecione pelo menos ${option.min_selections} item(ns) em "${option.name}"`);
        return;
      }
    }

    // Build selected options data
    const optionsData: SelectedOption[] = Object.entries(selectedOptions)
      .filter(([_, items]) => items.length > 0)
      .map(([optionId, itemIds]) => {
        const option = productOptions.find(o => o.id === optionId)!;
        return {
          optionId,
          optionName: option.name,
          items: itemIds.map(itemId => {
            const item = option.items.find(i => i.id === itemId)!;
            return {
              itemId: item.id,
              itemName: item.name,
              itemPrice: item.price,
            };
          }),
        };
      });

    addItem({
      id: selectedProduct.id,
      name: selectedProduct.name,
      price: selectedProduct.price,
      image_url: selectedProduct.image_url,
      selectedOptions: optionsData.length > 0 ? optionsData : undefined,
    });
    
    toast.success(`${selectedProduct.name} adicionado ao carrinho!`);
    setOptionsDialogOpen(false);
    setSelectedProduct(null);
    setProductOptions([]);
    setSelectedOptions({});
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

  const getDayLabel = (day: string) => {
    const dayMap: Record<string, string> = {
      monday: "Seg", tuesday: "Ter", wednesday: "Qua",
      thursday: "Qui", friday: "Sex", saturday: "Sáb", sunday: "Dom"
    };
    return dayMap[day] || day;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-primary text-primary-foreground sticky top-0 z-40 shadow-elevated">
        <div className="container mx-auto px-4 py-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4 flex-1">
              {restaurant.logo_url && (
                <div className="relative">
                  <img
                    src={restaurant.logo_url}
                    alt={restaurant.name}
                    className="w-16 h-16 rounded-2xl object-cover bg-white shadow-xl border-4 border-white/20"
                  />
                  <Sparkles className="absolute -top-1 -right-1 h-5 w-5 text-yellow-300 animate-pulse" />
                </div>
              )}
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold drop-shadow-lg flex items-center gap-2">
                  {restaurant.name}
                  {isRestaurantOpen() && <span className="text-xl">✨</span>}
                </h1>
                {restaurant.description && (
                  <p className="text-sm opacity-90 mt-1 hidden md:block">{restaurant.description}</p>
                )}
              </div>
            </div>
            <Button
              variant="secondary"
              size="lg"
              onClick={() => setCartOpen(true)}
              className="relative shadow-xl hover:scale-105 transition-transform"
            >
              <ShoppingCart className="mr-2 h-5 w-5" />
              <span className="hidden sm:inline font-semibold">Carrinho</span>
              {items.length > 0 && (
                <Badge className="absolute -top-2 -right-2 bg-destructive h-7 w-7 flex items-center justify-center p-0 text-xs font-bold animate-pulse shadow-lg">
                  {items.length}
                </Badge>
              )}
            </Button>
          </div>
          
          <div className="space-y-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="🔍 Busque seu prato favorito..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 pr-4 h-12 bg-white/95 backdrop-blur-sm border-2 border-white/50 text-foreground placeholder:text-muted-foreground focus:border-white text-base font-medium shadow-lg"
              />
            </div>
            
            {/* Restaurant Info */}
            <div className="flex flex-wrap gap-2 text-sm">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-xl backdrop-blur-sm font-semibold shadow-lg ${
                isRestaurantOpen() 
                  ? 'bg-green-500/90 text-white animate-pulse' 
                  : 'bg-red-500/90 text-white'
              }`}>
                <Clock size={16} />
                <span>{isRestaurantOpen() ? "🟢 ABERTO" : "🔴 FECHADO"}</span>
              </div>
              
              {restaurant.opening_time && restaurant.closing_time && (
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm font-medium shadow-lg">
                  <span>⏰ {restaurant.opening_time} - {restaurant.closing_time}</span>
                </div>
              )}
              
              {restaurant.working_days && restaurant.working_days.length < 7 && (
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm font-medium shadow-lg">
                  <span>📅 {restaurant.working_days.map(getDayLabel).join(", ")}</span>
                </div>
              )}
              
              {restaurant.phone && (
                <div className="flex items-center gap-2 bg-white/20 px-4 py-2 rounded-xl backdrop-blur-sm font-medium shadow-lg">
                  <Phone size={16} />
                  <span>{restaurant.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {!isRestaurantOpen() && (
        <div className="bg-gradient-to-r from-destructive/20 to-destructive/10 border-y-4 border-destructive/50 py-6 animate-fade-in-up">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-center gap-4 text-center">
              <div className="text-5xl">😴</div>
              <div>
                <h3 className="text-xl font-bold text-destructive mb-1">Estamos Fechados Agora</h3>
                <p className="text-sm text-muted-foreground font-medium">
                  Voltamos {restaurant.opening_time}. Navegue pelo cardápio, mas pedidos só durante o horário de funcionamento!
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu */}
      <main className="container mx-auto px-4 py-8 pb-24">
        {searchTerm && (
          <div className="mb-6 p-4 bg-primary/10 rounded-xl border-2 border-primary/30 animate-fade-in-up">
            <p className="text-foreground font-semibold">
              🔎 {filteredProducts.length} resultado(s) encontrado(s) para <span className="text-primary">"{searchTerm}"</span>
            </p>
          </div>
        )}
        
        {categories.map((category, idx) => {
          const categoryProducts = (searchTerm ? filteredProducts : products).filter(
            (p) => p.category_id === category.id
          );

          if (categoryProducts.length === 0) return null;

          return (
            <section key={category.id} className="mb-16 animate-fade-in-up" style={{ animationDelay: `${idx * 0.1}s` }}>
              <div className="mb-8 relative">
                <div className="flex items-center gap-4">
                  <div className="h-2 w-16 bg-gradient-primary rounded-full shadow-lg"></div>
                  <h2 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent flex items-center gap-2">
                    {category.name}
                    <Sparkles className="h-6 w-6 text-primary" />
                  </h2>
                  <div className="h-2 flex-1 bg-gradient-primary rounded-full opacity-20"></div>
                </div>
                {category.description && (
                  <p className="text-muted-foreground mt-3 ml-20 text-base font-medium">
                    {category.description}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {categoryProducts.map((product, pIdx) => (
                  <Card
                    key={product.id}
                    className={`group overflow-hidden transition-all duration-300 hover:-translate-y-3 cursor-pointer border-2 bg-card/95 backdrop-blur animate-fade-in-up ${
                      !product.is_available 
                        ? "opacity-60 hover:border-muted" 
                        : "hover:shadow-elevated hover:border-primary/50"
                    }`}
                    style={{ animationDelay: `${pIdx * 0.05}s` }}
                    onClick={() => !isRestaurantOpen() && toast.error("Restaurante fechado no momento 😔")}
                  >
                    {product.image_url && (
                      <div className="relative h-64 overflow-hidden bg-muted">
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        {!product.is_available && (
                          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                            <Badge variant="secondary" className="text-base px-6 py-2 shadow-xl font-bold">
                              😔 Esgotado
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <CardTitle className="text-2xl group-hover:text-primary transition-colors line-clamp-2">
                        {product.name}
                      </CardTitle>
                      {product.description && (
                        <CardDescription className="text-base line-clamp-3 mt-2">
                          {product.description}
                        </CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                            R$ {product.price.toFixed(2)}
                          </span>
                        </div>
                        <Button
                          variant="gradient"
                          size="lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToCart(product);
                          }}
                          disabled={!product.is_available || !isRestaurantOpen()}
                          className="group-hover:scale-110 transition-transform shadow-xl font-semibold"
                        >
                          <Plus className="h-5 w-5 mr-2" />
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
          <div className="text-center py-20 animate-fade-in-up">
            <div className="text-8xl mb-6">👨‍🍳</div>
            <h3 className="text-3xl font-bold text-foreground mb-3">Cardápio em Construção</h3>
            <p className="text-muted-foreground text-lg">
              Nossos chefs estão preparando delícias incríveis! Volte em breve 🍽️
            </p>
          </div>
        )}
        
        {searchTerm && filteredProducts.length === 0 && (
          <div className="text-center py-20 animate-fade-in-up">
            <div className="text-8xl mb-6">🔍</div>
            <h3 className="text-3xl font-bold text-foreground mb-3">Nada Encontrado</h3>
            <p className="text-muted-foreground text-lg">
              Tente buscar com outros termos ou explore nosso cardápio completo
            </p>
          </div>
        )}
      </main>

      <CartSheet
        open={cartOpen}
        onOpenChange={setCartOpen}
        restaurant={restaurant}
      />

      {/* Options Dialog */}
      <Dialog open={optionsDialogOpen} onOpenChange={setOptionsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {selectedProduct?.name}
            </DialogTitle>
          </DialogHeader>
          
          {loadingOptions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-muted-foreground">Carregando opções...</p>
            </div>
          ) : (
            <div className="space-y-6 pt-4">
              {productOptions.map((option) => (
                <Card key={option.id}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center justify-between">
                      <span>
                        {option.name}
                        {option.is_required && (
                          <span className="ml-2 text-sm text-destructive font-normal">*obrigatório</span>
                        )}
                      </span>
                      <span className="text-sm text-muted-foreground font-normal">
                        {option.max_selections === 1 ? "Escolha 1" : `Escolha até ${option.max_selections}`}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {option.items.map((item) => {
                      const isSelected = (selectedOptions[option.id] || []).includes(item.id);
                      return (
                        <div key={item.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent transition-colors">
                          <Checkbox
                            id={item.id}
                            checked={isSelected}
                            onCheckedChange={(checked) => 
                              handleOptionChange(option.id, item.id, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={item.id}
                            className="flex-1 cursor-pointer flex items-center justify-between"
                          >
                            <span className="font-medium">{item.name}</span>
                            {item.price > 0 && (
                              <span className="text-sm text-primary font-semibold">
                                + R$ {item.price.toFixed(2)}
                              </span>
                            )}
                          </Label>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
              
              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOptionsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="gradient"
                  className="flex-1"
                  onClick={handleConfirmOptions}
                >
                  Adicionar ao Carrinho
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
