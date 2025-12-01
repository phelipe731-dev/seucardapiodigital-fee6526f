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
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Minus, Trash2, ShoppingCart, User, Split } from "lucide-react";
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

interface SplitPayment {
  id: string;
  items: CartItem[];
  amount: number;
  paymentMethod: string;
  customerName: string;
  customerPhone: string;
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
  const [showSplitDialog, setShowSplitDialog] = useState(false);
  const [splitType, setSplitType] = useState<"items" | "value">("items");
  const [splitPayments, setSplitPayments] = useState<SplitPayment[]>([]);
  const [selectedItemsForSplit, setSelectedItemsForSplit] = useState<Set<string>>(new Set());
  const [numberOfSplits, setNumberOfSplits] = useState(2);

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

  const handleSplitByItems = () => {
    if (selectedItemsForSplit.size === 0) {
      toast.error("Selecione itens para dividir");
      return;
    }

    const selectedItems = cart.filter(item => selectedItemsForSplit.has(item.product.id));
    const remainingItems = cart.filter(item => !selectedItemsForSplit.has(item.product.id));

    const selectedTotal = selectedItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
    const remainingTotal = remainingItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);

    const newSplits: SplitPayment[] = [
      {
        id: crypto.randomUUID(),
        items: selectedItems,
        amount: selectedTotal,
        paymentMethod: "dinheiro",
        customerName: customerName || "Cliente 1",
        customerPhone: customerPhone || ""
      },
      {
        id: crypto.randomUUID(),
        items: remainingItems,
        amount: remainingTotal,
        paymentMethod: "dinheiro",
        customerName: "Cliente 2",
        customerPhone: ""
      }
    ];

    setSplitPayments(newSplits);
    setSelectedItemsForSplit(new Set());
    toast.success("Conta dividida por itens!");
  };

  const handleSplitByValue = () => {
    if (numberOfSplits < 2 || numberOfSplits > 10) {
      toast.error("Divida entre 2 e 10 pessoas");
      return;
    }

    const total = calculateTotal();
    const amountPerPerson = total / numberOfSplits;

    const newSplits: SplitPayment[] = Array.from({ length: numberOfSplits }, (_, i) => ({
      id: crypto.randomUUID(),
      items: cart,
      amount: amountPerPerson,
      paymentMethod: "dinheiro",
      customerName: customerName && i === 0 ? customerName : `Cliente ${i + 1}`,
      customerPhone: customerPhone && i === 0 ? customerPhone : ""
    }));

    setSplitPayments(newSplits);
    toast.success(`Conta dividida em ${numberOfSplits}x de R$ ${amountPerPerson.toFixed(2)}`);
  };

  const updateSplitPayment = (id: string, field: keyof SplitPayment, value: any) => {
    setSplitPayments(splits => splits.map(split => 
      split.id === id ? { ...split, [field]: value } : split
    ));
  };

  const removeSplitPayment = (id: string) => {
    setSplitPayments(splits => splits.filter(split => split.id !== id));
    toast.info("Pagamento removido");
  };

  const toggleItemSelection = (productId: string) => {
    setSelectedItemsForSplit(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
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

  const handleFinishSplitOrder = async () => {
    if (splitPayments.length === 0) {
      toast.error("Configure os pagamentos divididos");
      return;
    }

    setLoading(true);

    try {
      for (const split of splitPayments) {
        if (!split.customerName.trim()) {
          toast.error("Informe o nome de todos os clientes");
          setLoading(false);
          return;
        }

        // Create individual order for each split
        const { data: order, error: orderError } = await supabase
          .from("orders")
          .insert({
            restaurant_id: restaurant.id,
            customer_name: split.customerName,
            customer_phone: split.customerPhone || null,
            payment_method: split.paymentMethod,
            total_amount: split.amount,
            status: "pending",
            notes: `Pedido dividido via PDV - ${splitType === "items" ? "Por itens" : "Por valor"}`
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create order items for this split
        if (splitType === "items") {
          const orderItems = split.items.map(item => ({
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
        } else {
          // For value split, duplicate all items with proportional quantities
          const orderItems = cart.map(item => ({
            order_id: order.id,
            product_id: item.product.id,
            quantity: item.quantity,
            unit_price: item.product.price,
            observations: `${item.observations || ""} (Conta dividida)`.trim()
          }));

          const { error: itemsError } = await supabase
            .from("order_items")
            .insert(orderItems);

          if (itemsError) throw itemsError;
        }
      }

      toast.success(`${splitPayments.length} pedidos criados com sucesso!`);
      
      // Clear form
      setCart([]);
      setCustomerName("");
      setCustomerPhone("");
      setPaymentMethod("dinheiro");
      setSplitPayments([]);
      setShowSplitDialog(false);
      
    } catch (error) {
      console.error("Error creating split orders:", error);
      toast.error("Erro ao criar pedidos divididos");
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
              
              <div className="grid grid-cols-2 gap-2">
                <Dialog open={showSplitDialog} onOpenChange={setShowSplitDialog}>
                  <DialogTrigger asChild>
                    <Button 
                      variant="outline"
                      disabled={loading || cart.length === 0}
                      className="w-full"
                      size="lg"
                    >
                      <Split className="h-4 w-4 mr-2" />
                      Dividir
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Dividir Conta</DialogTitle>
                      <DialogDescription>
                        Escolha como deseja dividir o pagamento
                      </DialogDescription>
                    </DialogHeader>

                    <Tabs value={splitType} onValueChange={(v) => setSplitType(v as "items" | "value")}>
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="items">Por Itens</TabsTrigger>
                        <TabsTrigger value="value">Por Valor</TabsTrigger>
                      </TabsList>

                      <TabsContent value="items" className="space-y-4">
                        <div className="space-y-3">
                          <p className="text-sm text-muted-foreground">
                            Selecione os itens que serão pagos separadamente
                          </p>
                          
                          <div className="space-y-2">
                            {cart.map(item => (
                              <Card key={item.product.id}>
                                <CardContent className="p-3 flex items-center gap-3">
                                  <Checkbox
                                    checked={selectedItemsForSplit.has(item.product.id)}
                                    onCheckedChange={() => toggleItemSelection(item.product.id)}
                                  />
                                  <div className="flex-1">
                                    <p className="font-semibold text-sm">{item.product.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                      {item.quantity}x R$ {item.product.price.toFixed(2)} = R$ {(item.quantity * item.product.price).toFixed(2)}
                                    </p>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>

                          <Button onClick={handleSplitByItems} className="w-full">
                            Dividir Itens Selecionados
                          </Button>
                        </div>
                      </TabsContent>

                      <TabsContent value="value" className="space-y-4">
                        <div className="space-y-3">
                          <div>
                            <Label htmlFor="splits">Dividir entre quantas pessoas?</Label>
                            <Input
                              id="splits"
                              type="number"
                              min="2"
                              max="10"
                              value={numberOfSplits}
                              onChange={(e) => setNumberOfSplits(parseInt(e.target.value) || 2)}
                            />
                          </div>

                          <Card className="bg-muted/50">
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Total da conta:</span>
                                <span className="font-bold">R$ {calculateTotal().toFixed(2)}</span>
                              </div>
                              <Separator className="my-2" />
                              <div className="flex items-center justify-between">
                                <span className="text-sm">Valor por pessoa:</span>
                                <span className="font-bold text-primary">
                                  R$ {(calculateTotal() / numberOfSplits).toFixed(2)}
                                </span>
                              </div>
                            </CardContent>
                          </Card>

                          <Button onClick={handleSplitByValue} className="w-full">
                            Dividir Valor Igualmente
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>

                    {splitPayments.length > 0 && (
                      <div className="space-y-4 mt-6">
                        <Separator />
                        <h3 className="font-semibold">Pagamentos Divididos</h3>
                        
                        <ScrollArea className="h-[300px]">
                          <div className="space-y-3">
                            {splitPayments.map((split, index) => (
                              <Card key={split.id}>
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm">Pagamento {index + 1}</CardTitle>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => removeSplitPayment(split.id)}
                                      className="h-7 w-7 p-0"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <Label className="text-xs">Nome</Label>
                                      <Input
                                        value={split.customerName}
                                        onChange={(e) => updateSplitPayment(split.id, "customerName", e.target.value)}
                                        placeholder="Nome do cliente"
                                        className="h-8"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Telefone</Label>
                                      <Input
                                        value={split.customerPhone}
                                        onChange={(e) => updateSplitPayment(split.id, "customerPhone", e.target.value)}
                                        placeholder="Telefone"
                                        className="h-8"
                                      />
                                    </div>
                                  </div>
                                  
                                  <div>
                                    <Label className="text-xs">Forma de Pagamento</Label>
                                    <Select 
                                      value={split.paymentMethod} 
                                      onValueChange={(v) => updateSplitPayment(split.id, "paymentMethod", v)}
                                    >
                                      <SelectTrigger className="h-8">
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

                                  <div className="pt-2 border-t">
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm font-semibold">Valor:</span>
                                      <span className="font-bold text-primary">
                                        R$ {split.amount.toFixed(2)}
                                      </span>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>

                        <Button 
                          onClick={handleFinishSplitOrder}
                          disabled={loading}
                          className="w-full"
                          size="lg"
                        >
                          Finalizar {splitPayments.length} Pedidos
                        </Button>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>

                <Button 
                  onClick={handleFinishOrder}
                  disabled={loading || cart.length === 0}
                  className="w-full"
                  size="lg"
                >
                  Finalizar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
