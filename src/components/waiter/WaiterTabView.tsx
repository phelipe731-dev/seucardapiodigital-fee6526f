import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Minus, 
  Trash2, 
  ArrowLeft, 
  Save, 
  Printer, 
  CheckCircle,
  Search
} from "lucide-react";
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

interface WaiterTabViewProps {
  tabId?: string | null;
  onBack: () => void;
  onSaved: () => void;
  waiterId: string;
}

export function WaiterTabView({ tabId, onBack, onSaved, waiterId }: WaiterTabViewProps) {
  const [restaurant, setRestaurant] = useState<any>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [tabNumber, setTabNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("dinheiro");

  useEffect(() => {
    loadData();
    if (tabId) {
      loadTab();
    }
  }, [tabId]);

  const loadData = async () => {
    try {
      // Get any restaurant (waiters can work for any restaurant)
      const { data: restaurantData } = await supabase
        .from("restaurants")
        .select("*")
        .eq("is_active", true)
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
    } catch (error: any) {
      toast.error("Erro ao carregar dados");
    }
  };

  const loadTab = async () => {
    if (!tabId) return;

    try {
      const { data, error } = await supabase
        .from("open_tabs")
        .select("*")
        .eq("id", tabId)
        .single();

      if (error) throw error;
      if (data) {
        setCart(JSON.parse(JSON.stringify(data.items)) as CartItem[]);
        setCustomerName(data.customer_name || "");
        setCustomerPhone(data.customer_phone || "");
        setTabNumber(data.tab_number);
        setNotes(data.notes || "");
      }
    } catch (error: any) {
      toast.error("Erro ao carregar comanda");
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
    
    toast.success(`${product.name} adicionado`);
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
  };

  const calculateTotal = () => {
    return cart.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const handleSave = async () => {
    if (cart.length === 0) {
      toast.error("Adicione itens antes de salvar");
      return;
    }

    if (!tabNumber.trim()) {
      toast.error("Informe o número da comanda");
      return;
    }

    setLoading(true);

    try {
      const total = calculateTotal();
      const tabData = {
        restaurant_id: restaurant.id,
        waiter_id: waiterId,
        tab_number: tabNumber,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        items: JSON.parse(JSON.stringify(cart)) as any,
        total_amount: total,
        notes: notes || null
      };

      if (tabId) {
        // Update existing tab
        const { error } = await supabase
          .from("open_tabs")
          .update(tabData)
          .eq("id", tabId);

        if (error) throw error;
        toast.success("Comanda atualizada!");
      } else {
        // Create new tab
        const { error } = await supabase
          .from("open_tabs")
          .insert(tabData);

        if (error) throw error;
        toast.success("Comanda criada!");
      }

      onSaved();
      onBack();
    } catch (error: any) {
      console.error("Error saving tab:", error);
      toast.error("Erro ao salvar comanda: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = async () => {
    if (!tabId) {
      toast.error("Salve a comanda antes de imprimir");
      return;
    }

    try {
      const printHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Courier New', monospace; max-width: 300px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
            .item { display: flex; justify-between; margin: 5px 0; }
            .total { border-top: 2px dashed #000; padding-top: 10px; margin-top: 10px; font-weight: bold; }
            h1 { font-size: 18px; margin: 5px 0; }
            .info { font-size: 12px; margin: 3px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${restaurant.name}</h1>
            <div class="info">COMANDA #${tabNumber}</div>
            <div class="info">${new Date().toLocaleString('pt-BR')}</div>
          </div>
          
          ${customerName ? `<div class="info"><strong>Cliente:</strong> ${customerName}</div>` : ''}
          ${customerPhone ? `<div class="info"><strong>Telefone:</strong> ${customerPhone}</div>` : ''}
          
          <div style="margin: 15px 0;">
            ${cart.map(item => `
              <div class="item">
                <span>${item.quantity}x ${item.product.name}</span>
                <span>R$ ${(item.quantity * item.product.price).toFixed(2)}</span>
              </div>
              ${item.observations ? `<div class="info" style="margin-left: 20px; font-style: italic;">Obs: ${item.observations}</div>` : ''}
            `).join('')}
          </div>
          
          ${notes ? `<div class="info"><strong>Observações:</strong> ${notes}</div>` : ''}
          
          <div class="total">
            <div class="item">
              <span>TOTAL</span>
              <span>R$ ${calculateTotal().toFixed(2)}</span>
            </div>
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(printHTML);
        printWindow.document.close();
        printWindow.print();
      }

      toast.success("Comanda enviada para impressão");
    } catch (error) {
      console.error("Error printing:", error);
      toast.error("Erro ao imprimir comanda");
    }
  };

  const handleFinish = async () => {
    if (cart.length === 0) {
      toast.error("Adicione itens antes de finalizar");
      return;
    }

    if (!customerName.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }

    setLoading(true);

    try {
      const total = calculateTotal();

      // Create order from tab
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          restaurant_id: restaurant.id,
          customer_name: customerName,
          customer_phone: customerPhone || null,
          payment_method: paymentMethod,
          total_amount: total,
          status: "pending",
          notes: notes || "Pedido criado via comanda",
          waiter_id: waiterId
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

      // Delete the tab
      if (tabId) {
        await supabase.from("open_tabs").delete().eq("id", tabId);
      }

      toast.success("Pedido criado e comanda fechada!");
      onSaved();
      onBack();
    } catch (error: any) {
      console.error("Error finishing tab:", error);
      toast.error("Erro ao finalizar comanda: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold">
            {tabId ? `Editar Comanda #${tabNumber}` : "Nova Comanda"}
          </h2>
        </div>
        {tabId && (
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-hidden">
        {/* Products Section */}
        <div className="lg:col-span-2 flex flex-col gap-4 overflow-hidden">
          {/* Search and Filter */}
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
              <TabsList className="w-full justify-start overflow-x-auto">
                <TabsTrigger value="all">Todos</TabsTrigger>
                {categories.map(category => (
                  <TabsTrigger key={category.id} value={category.id}>
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* Products Grid */}
          <ScrollArea className="flex-1">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 pb-4">
              {filteredProducts.map(product => (
                <Card
                  key={product.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-3">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-24 object-cover rounded-md mb-2"
                      />
                    )}
                    <h3 className="font-semibold text-sm line-clamp-2 mb-1">
                      {product.name}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {product.categories.name}
                    </Badge>
                    <p className="text-lg font-bold text-primary mt-2">
                      R$ {product.price.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Cart Section */}
        <div className="flex flex-col gap-4 overflow-hidden">
          <Card className="flex-1 flex flex-col overflow-hidden">
            <CardHeader>
              <CardTitle>Itens da Comanda</CardTitle>
              <CardDescription>
                {cart.length} {cart.length === 1 ? "item" : "itens"}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
              <ScrollArea className="flex-1 -mx-6 px-6">
                {cart.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Adicione produtos à comanda
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map(item => (
                      <Card key={item.product.id}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-sm">
                                {item.product.name}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                R$ {item.product.price.toFixed(2)} cada
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeFromCart(item.product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.product.id, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center font-semibold">
                              {item.quantity}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.product.id, 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <span className="ml-auto font-semibold">
                              R$ {(item.product.price * item.quantity).toFixed(2)}
                            </span>
                          </div>

                          <Textarea
                            placeholder="Observações..."
                            value={item.observations}
                            onChange={(e) => updateObservations(item.product.id, e.target.value)}
                            className="text-xs"
                            rows={2}
                          />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </ScrollArea>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span className="text-primary">R$ {calculateTotal().toFixed(2)}</span>
                </div>

                <div className="space-y-2">
                  <Label>Número da Comanda *</Label>
                  <Input
                    placeholder="Ex: 1, Mesa 5, etc"
                    value={tabNumber}
                    onChange={(e) => setTabNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Nome do Cliente *</Label>
                  <Input
                    placeholder="Nome do cliente"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    placeholder="(00) 00000-0000"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Observações</Label>
                  <Textarea
                    placeholder="Observações gerais..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Forma de Pagamento (para fechar)</Label>
                  <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dinheiro">Dinheiro</SelectItem>
                      <SelectItem value="cartao_credito">Cartão de Crédito</SelectItem>
                      <SelectItem value="cartao_debito">Cartão de Débito</SelectItem>
                      <SelectItem value="pix">PIX</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={handleSave}
                    disabled={loading}
                    variant="outline"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Salvar
                  </Button>
                  <Button
                    onClick={handleFinish}
                    disabled={loading}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Fechar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}