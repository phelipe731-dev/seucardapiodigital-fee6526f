import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { toast } from "sonner";
import type { SelectedOption } from "@/contexts/CartContext";

import { RestaurantHeader } from "@/components/menu/RestaurantHeader";
import { DeliveryOptions, OrderType } from "@/components/menu/DeliveryOptions";
import { CategoryNav } from "@/components/menu/CategoryNav";
import { CategorySection } from "@/components/menu/ProductCard";
import { DailyDealsSection } from "@/components/menu/DailyDealsSection";
import { FloatingCartButton } from "@/components/menu/FloatingCartButton";

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  logo_url: string | null;
  cover_url: string | null;
  phone: string;
  whatsapp: string;
  address: string | null;
  opening_time: string | null;
  closing_time: string | null;
  accepts_delivery: boolean | null;
  working_days: string[] | null;
  accepts_orders_override: boolean | null;
  delivery_time_min: number | null;
  delivery_time_max: number | null;
  payment_methods: string[] | null;
}

interface Category {
  id: string;
  name: string;
  description: string | null;
  display_order: number;
}

interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  is_available: boolean;
  category_id: string;
  is_daily_deal: boolean | null;
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tableNumber = searchParams.get("mesa");
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [dailyDeals, setDailyDeals] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [orderType, setOrderType] = useState<OrderType>('delivery');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  
  const [optionsDialogOpen, setOptionsDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({});
  const [loadingOptions, setLoadingOptions] = useState(false);
  
  const { addItem, items, subtotal } = useCart();
  const categoryRefs = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    loadMenu();
  }, [restaurantId]);

  // Initialize expanded categories after loading
  useEffect(() => {
    if (categories.length > 0 && expandedCategories.size === 0) {
      setExpandedCategories(new Set(categories.map(c => c.id)));
      setActiveCategory(categories[0]?.id || null);
    }
  }, [categories]);

  // Scroll spy for category navigation
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 100;
      
      for (const category of categories) {
        const element = document.getElementById(`category-${category.id}`);
        if (element) {
          const { offsetTop, offsetHeight } = element;
          if (scrollPosition >= offsetTop && scrollPosition < offsetTop + offsetHeight) {
            setActiveCategory(category.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [categories]);

  const isRestaurantOpen = useCallback(() => {
    if (!restaurant) return false;
    
    if (restaurant.accepts_orders_override !== null) {
      return restaurant.accepts_orders_override;
    }
    
    const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const today = daysOfWeek[new Date().getDay()];
    
    if (restaurant.working_days && !restaurant.working_days.includes(today)) {
      return false;
    }
    
    if (!restaurant.opening_time || !restaurant.closing_time) return true;
    
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [openHour, openMin] = restaurant.opening_time.split(':').map(Number);
    const [closeHour, closeMin] = restaurant.closing_time.split(':').map(Number);
    
    const openingMinutes = openHour * 60 + openMin;
    const closingMinutes = closeHour * 60 + closeMin;
    
    return currentTime >= openingMinutes && currentTime <= closingMinutes;
  }, [restaurant]);

  const loadMenu = async () => {
    try {
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", restaurantId)
        .eq("is_active", true)
        .single();

      if (restaurantError) throw restaurantError;
      setRestaurant(restaurantData as Restaurant);

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
      
      const allProducts = (productsData || []) as Product[];
      const dealsProducts = allProducts.filter(p => p.is_daily_deal);
      const regularProducts = allProducts.filter(p => !p.is_daily_deal);
      
      setDailyDeals(dealsProducts);
      setProducts(regularProducts);
    } catch (error: any) {
      toast.error("Erro ao carregar cardápio");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryClick = (categoryId: string) => {
    setActiveCategory(categoryId);
    const element = document.getElementById(`category-${categoryId}`);
    if (element) {
      const offset = 56; // Height of sticky nav
      const top = element.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
    // Ensure category is expanded
    setExpandedCategories(prev => new Set([...prev, categoryId]));
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId);
      } else {
        newSet.add(categoryId);
      }
      return newSet;
    });
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

    setLoadingOptions(true);
    setSelectedProduct(product);
    
    const { data: optionsData, error: optionsError } = await supabase
      .from("product_options")
      .select("*")
      .eq("product_id", product.id)
      .order("display_order");

    if (optionsError || !optionsData || optionsData.length === 0) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        image_url: product.image_url,
      });
      toast.success(`${product.name} adicionado ao carrinho!`);
      setLoadingOptions(false);
      setSelectedProduct(null);
      return;
    }

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

  const filteredProducts = searchTerm
    ? products.filter((product) =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : products;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-primary border-t-transparent mx-auto"></div>
          <p className="mt-4 text-sm text-muted-foreground">Carregando cardápio...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center">
          <div className="text-6xl mb-4">🍽️</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">Restaurante não encontrado</h2>
          <p className="text-sm text-muted-foreground">
            O cardápio que você procura não existe ou não está disponível.
          </p>
        </div>
      </div>
    );
  }

  const isOpen = isRestaurantOpen();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Restaurant Header with Cover, Logo, Status */}
      <RestaurantHeader
        restaurant={restaurant}
        isOpen={isOpen}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
      />

      {/* Table Badge */}
      {tableNumber && (
        <div className="px-4 py-2 bg-primary/10">
          <Badge variant="secondary" className="w-full justify-center py-1">
            📍 Mesa {tableNumber}
          </Badge>
        </div>
      )}

      {/* Closed Notice */}
      {!isOpen && (
        <div className="px-4 py-3 bg-destructive/10 border-y border-destructive/20">
          <p className="text-sm text-center text-destructive font-medium">
            😴 Estamos fechados. Pedidos indisponíveis.
          </p>
        </div>
      )}

      {/* Delivery Options */}
      <DeliveryOptions
        selected={orderType}
        onSelect={setOrderType}
        acceptsDelivery={restaurant.accepts_delivery || false}
      />

      {/* Category Navigation */}
      <CategoryNav
        categories={categories}
        activeCategory={activeCategory}
        onCategoryClick={handleCategoryClick}
      />

      {/* Daily Deals */}
      {dailyDeals.length > 0 && !searchTerm && (
        <DailyDealsSection
          products={dailyDeals}
          onAddProduct={handleAddToCart}
          disabled={!isOpen}
        />
      )}

      {/* Search Results Info */}
      {searchTerm && (
        <div className="px-4 py-2">
          <p className="text-sm text-muted-foreground">
            {filteredProducts.length} resultado(s) para "{searchTerm}"
          </p>
        </div>
      )}

      {/* Product Categories */}
      <div className="divide-y">
        {categories.map((category) => {
          const categoryProducts = filteredProducts.filter(p => p.category_id === category.id);
          return (
            <CategorySection
              key={category.id}
              category={category}
              products={categoryProducts}
              onAddProduct={handleAddToCart}
              isExpanded={expandedCategories.has(category.id)}
              onToggle={() => toggleCategory(category.id)}
              disabled={!isOpen}
            />
          );
        })}
      </div>

      {/* Empty States */}
      {categories.length === 0 && !loading && (
        <div className="text-center py-16 px-4">
          <div className="text-5xl mb-4">👨‍🍳</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Cardápio em construção</h3>
          <p className="text-sm text-muted-foreground">Volte em breve!</p>
        </div>
      )}
      
      {searchTerm && filteredProducts.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="text-lg font-semibold text-foreground mb-2">Nada encontrado</h3>
          <p className="text-sm text-muted-foreground">Tente outros termos de busca</p>
        </div>
      )}

      {/* Floating Cart Button */}
      <FloatingCartButton
        itemCount={items.length}
        total={subtotal}
        onClick={() => navigate(`/checkout/${restaurantId}${tableNumber ? `?mesa=${tableNumber}` : ''}`)}
      />

      {/* Options Dialog */}
      <Dialog open={optionsDialogOpen} onOpenChange={setOptionsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          
          {loadingOptions ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent mx-auto"></div>
              <p className="mt-3 text-sm text-muted-foreground">Carregando opções...</p>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {productOptions.map((option) => (
                <Card key={option.id}>
                  <CardHeader className="py-3 px-4">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>
                        {option.name}
                        {option.is_required && (
                          <span className="ml-2 text-xs text-destructive">*</span>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground font-normal">
                        {option.max_selections === 1 ? "Escolha 1" : `Até ${option.max_selections}`}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="py-2 px-4 space-y-2">
                    {option.items.map((item) => {
                      const isSelected = (selectedOptions[option.id] || []).includes(item.id);
                      return (
                        <div 
                          key={item.id} 
                          className="flex items-center space-x-3 p-2 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            id={item.id}
                            checked={isSelected}
                            onCheckedChange={(checked) => 
                              handleOptionChange(option.id, item.id, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={item.id}
                            className="flex-1 cursor-pointer flex items-center justify-between text-sm"
                          >
                            <span>{item.name}</span>
                            {item.price > 0 && (
                              <span className="text-primary font-medium">
                                +R$ {item.price.toFixed(2).replace('.', ',')}
                              </span>
                            )}
                          </Label>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              ))}
              
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setOptionsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleConfirmOptions}
                >
                  Adicionar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
