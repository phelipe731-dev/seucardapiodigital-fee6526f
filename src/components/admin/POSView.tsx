import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Minus, Trash2, ShoppingCart, User } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
  price: number;
  description: string | null;
  image_url: string | null;
  category_id: string;
  categories: {
    name: string;
  };
}

interface CartItem {
  product: Product;
  quantity: number;
  observations: string;
}

export function POSView() {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Load restaurant
    const { data: restaurantData } = await supabase
      .from("restaurants")
      .select("*")
      .eq("owner_id", user.id)
      .single();
    
    if (restaurantData) {
      setRestaurant(restaurantData);

      // Load categories
      const { data: categoriesData } = await supabase
        .from("categories")
        .select("*")
        .eq("restaurant_id", restaurantData.id)
        .eq("is_active", true)
        .order("display_order");
      
      setCategories(categoriesData || []);

      // Load products
      const { data: productsData } = await supabase
        .from("products")
        .select(`
          *,
          categories (
            name
          )
        `)
        .eq("restaurant_id", restaurantData.id)
        .eq("is_active", true)
        .eq("is_available", true)
        .order("name");
      
      setProducts(productsData || []);
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product.id === product.id);
    
    if (existingItem) {
      setCart(cart.map(item => 
        item.product.id === product.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { product, quantity: 1, observations: "" }]);
    }
    
    toast.success(`${product.name} adicionado ao pedido`);
  };

  const updateQuantity = (productId: string, change: number) => {
    setCart(cart.map(item => {
      if (item.product.id === productId) {
        const newQuantity = item.quantity + change;
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const updateObservations = (productId: string, observations: string) => {
    setCart(cart.map(item => 
      item.product.id === productId 
        ? { ...item, observations }
        : item
    ));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter(item => item.product.id !== productId));
    toast.info("Item removido do pedido");
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const handleFinishOrder = async () => {
    if (cart.length === 0) {
      toast.error("Adicione itens ao pedido");
      return;
    }

    if (!customerName.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }

    setLoading(true);

    try {
      const total = calculateTotal();

      // Create order
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurant.id,
          customer_name: customerName,
          customer_phone: customerPhone || null,
          payment_method: paymentMethod,
          total_amount: total,
          status: "pending",
          notes: "Pedido criado via PDV"
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = cart.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        observations: item.observations || null
      }));

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);

      if (itemsError) throw itemsError;

      toast.success("Pedido criado com sucesso!");
      
      // Clear form
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setPaymentMethod("dinheiro");
      
    } catch (error) {
      console.error("Error creating order:", error);
      toast.error("Erro ao criar pedido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-12rem)]">
      {/* Products Section */}
      <div className="lg:col-span-2 space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Produtos Disponíveis</CardTitle>
            <CardDescription>Selecione os produtos para adicionar ao pedido</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search and Filter */}
            <div className="flex gap-3">
              <Input
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Products Grid */}
            <ScrollArea className="h-[calc(100vh-28rem)]">
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredProducts.map(product => (
                  <Card 
                    key={product.id}
                    className="cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-4">
                      {product.image_url && (
                        <img 
                          src={product.image_url} 
                          alt={product.name}
                          className="w-full h-32 object-cover rounded-md mb-3"
                        />
                      )}
                      <h3 className="font-semibold text-sm mb-1">{product.name}</h3>
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">
                          {product.categories?.name}
                        </Badge>
                        <span className="font-bold text-primary">
                          R$ {product.price.toFixed(2)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Cart Section */}
      <div className="space-y-4">
        <Card className="h-full flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Pedido Atual
            </CardTitle>
            <CardDescription>
              {cart.length} {cart.length === 1 ? "item" : "itens"}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            {/* Customer Info */}
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <User className="h-4 w-4" />
                Dados do Cliente
              </div>
              <div className="space-y-2">
                <div>
                  <Label htmlFor="customerName" className="text-xs">Nome *</Label>
                  <Input
                    id="customerName"
                    placeholder="Nome do cliente"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="customerPhone" className="text-xs">Telefone</Label>
                  <Input
                    id="customerPhone"
                    placeholder="(11) 99999-9999"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-9"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Cart Items */}
            <ScrollArea className="flex-1">
              <div className="space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum item adicionado
                  </div>
                ) : (
                  cart.map(item => (
                    <Card key={item.product.id}>
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{item.product.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              R$ {item.product.price.toFixed(2)} cada
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(item.product.id)}
                            className="h-7 w-7 p-0"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, -1)}
                            className="h-7 w-7 p-0"
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-semibold w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(item.product.id, 1)}
                            className="h-7 w-7 p-0"
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-semibold ml-auto">
                            R$ {(item.product.price * item.quantity).toFixed(2)}
                          </span>
                        </div>

                        <Textarea
                          placeholder="Observações (opcional)"
                          value={item.observations}
                          onChange={(e) => updateObservations(item.product.id, e.target.value)}
                          className="text-xs h-16 resize-none"
                        />
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>

            <Separator />

            {/* Payment Method */}
            <div className="space-y-2">
              <Label className="text-xs">Forma de Pagamento</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="pix">PIX</SelectItem>
                  <SelectItem value="credito">Cartão de Crédito</SelectItem>
                  <SelectItem value="debito">Cartão de Débito</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Total and Finish */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold">Total:</span>
                <span className="text-2xl font-bold text-primary">
                  R$ {calculateTotal().toFixed(2)}
                </span>
              </div>
              <Button 
                onClick={handleFinishOrder}
                disabled={loading || cart.length === 0}
                className="w-full"
                size="lg"
              >
                Finalizar Pedido
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
