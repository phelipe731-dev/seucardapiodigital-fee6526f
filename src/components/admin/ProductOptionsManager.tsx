import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, X } from "lucide-react";
import { toast } from "sonner";

interface Product {
  id: string;
  name: string;
}

interface OptionItem {
  id: string;
  name: string;
  price: number;
  display_order: number;
}

interface ProductOption {
  id: string;
  name: string;
  is_required: boolean;
  min_selections: number;
  max_selections: number;
  display_order: number;
  product_id: string;
  items: OptionItem[];
}

export function ProductOptionsManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingOption, setEditingOption] = useState<ProductOption | null>(null);
  const [editingItem, setEditingItem] = useState<OptionItem | null>(null);
  const [currentOptionId, setCurrentOptionId] = useState<string>("");
  
  // Option form state
  const [optionName, setOptionName] = useState("");
  const [isRequired, setIsRequired] = useState(false);
  const [minSelections, setMinSelections] = useState(0);
  const [maxSelections, setMaxSelections] = useState(1);
  
  // Item form state
  const [itemName, setItemName] = useState("");
  const [itemPrice, setItemPrice] = useState("0");

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadOptions();
    }
  }, [selectedProduct]);

  const loadProducts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: restaurant } = await supabase
      .from("restaurants")
      .select("id")
      .eq("owner_id", user.id)
      .single();

    if (!restaurant) return;

    const { data, error } = await supabase
      .from("products")
      .select("id, name")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true)
      .order("name");

    if (!error && data) {
      setProducts(data);
    }
  };

  const loadOptions = async () => {
    setLoading(true);
    const { data: optionsData, error: optionsError } = await supabase
      .from("product_options")
      .select("*")
      .eq("product_id", selectedProduct)
      .order("display_order");

    if (optionsError) {
      console.error(optionsError);
      setLoading(false);
      return;
    }

    const optionsWithItems = await Promise.all(
      (optionsData || []).map(async (option) => {
        const { data: items } = await supabase
          .from("product_option_items")
          .select("*")
          .eq("option_id", option.id)
          .order("display_order");

        return { ...option, items: items || [] };
      })
    );

    setOptions(optionsWithItems);
    setLoading(false);
  };

  const handleSaveOption = async () => {
    if (!optionName.trim() || !selectedProduct) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const optionData = {
      product_id: selectedProduct,
      name: optionName,
      is_required: isRequired,
      min_selections: minSelections,
      max_selections: maxSelections,
      display_order: editingOption?.display_order ?? options.length,
    };

    if (editingOption) {
      const { error } = await supabase
        .from("product_options")
        .update(optionData)
        .eq("id", editingOption.id);

      if (error) {
        toast.error("Erro ao atualizar opção");
        return;
      }
      toast.success("Opção atualizada!");
    } else {
      const { error } = await supabase
        .from("product_options")
        .insert(optionData);

      if (error) {
        toast.error("Erro ao criar opção");
        return;
      }
      toast.success("Opção criada!");
    }

    resetOptionForm();
    setDialogOpen(false);
    loadOptions();
  };

  const handleSaveItem = async () => {
    if (!itemName.trim() || !currentOptionId) {
      toast.error("Preencha todos os campos");
      return;
    }

    const currentOption = options.find(o => o.id === currentOptionId);
    const itemData = {
      option_id: currentOptionId,
      name: itemName,
      price: parseFloat(itemPrice),
      display_order: editingItem?.display_order ?? (currentOption?.items.length || 0),
    };

    if (editingItem) {
      const { error } = await supabase
        .from("product_option_items")
        .update(itemData)
        .eq("id", editingItem.id);

      if (error) {
        toast.error("Erro ao atualizar item");
        return;
      }
      toast.success("Item atualizado!");
    } else {
      const { error } = await supabase
        .from("product_option_items")
        .insert(itemData);

      if (error) {
        toast.error("Erro ao criar item");
        return;
      }
      toast.success("Item criado!");
    }

    resetItemForm();
    setItemDialogOpen(false);
    loadOptions();
  };

  const handleDeleteOption = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta opção?")) return;

    const { error } = await supabase
      .from("product_options")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir opção");
      return;
    }

    toast.success("Opção excluída!");
    loadOptions();
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este item?")) return;

    const { error } = await supabase
      .from("product_option_items")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Erro ao excluir item");
      return;
    }

    toast.success("Item excluído!");
    loadOptions();
  };

  const resetOptionForm = () => {
    setOptionName("");
    setIsRequired(false);
    setMinSelections(0);
    setMaxSelections(1);
    setEditingOption(null);
  };

  const resetItemForm = () => {
    setItemName("");
    setItemPrice("0");
    setEditingItem(null);
  };

  const handleEditOption = (option: ProductOption) => {
    setEditingOption(option);
    setOptionName(option.name);
    setIsRequired(option.is_required);
    setMinSelections(option.min_selections);
    setMaxSelections(option.max_selections);
    setDialogOpen(true);
  };

  const handleEditItem = (item: OptionItem, optionId: string) => {
    setEditingItem(item);
    setItemName(item.name);
    setItemPrice(item.price.toString());
    setCurrentOptionId(optionId);
    setItemDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Opcionais de Produtos</CardTitle>
        <CardDescription>
          Configure opções como tamanhos, ingredientes extras, sabores, etc.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <Label>Selecione um Produto</Label>
          <Select value={selectedProduct} onValueChange={setSelectedProduct}>
            <SelectTrigger>
              <SelectValue placeholder="Escolha um produto" />
            </SelectTrigger>
            <SelectContent>
              {products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedProduct && (
          <>
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Opções do Produto</h3>
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) resetOptionForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus size={18} className="mr-2" />
                    Nova Opção
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {editingOption ? "Editar Opção" : "Nova Opção"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <Label>Nome da Opção *</Label>
                      <Input
                        value={optionName}
                        onChange={(e) => setOptionName(e.target.value)}
                        placeholder="Ex: Tamanho, Adicionais, Sabores"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={isRequired}
                        onCheckedChange={setIsRequired}
                      />
                      <Label>Opção obrigatória</Label>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Mínimo de Seleções</Label>
                        <Input
                          type="number"
                          min="0"
                          value={minSelections}
                          onChange={(e) => setMinSelections(parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label>Máximo de Seleções</Label>
                        <Input
                          type="number"
                          min="1"
                          value={maxSelections}
                          onChange={(e) => setMaxSelections(parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                    <Button onClick={handleSaveOption} className="w-full">
                      {editingOption ? "Atualizar" : "Criar"} Opção
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {loading ? (
              <p className="text-center text-muted-foreground py-8">Carregando...</p>
            ) : options.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma opção configurada ainda
              </p>
            ) : (
              <div className="space-y-4">
                {options.map((option) => (
                  <Card key={option.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base">
                            {option.name}
                            {option.is_required && (
                              <span className="ml-2 text-xs text-red-600">OBRIGATÓRIO</span>
                            )}
                          </CardTitle>
                          <CardDescription className="text-sm">
                            Min: {option.min_selections} | Max: {option.max_selections}
                          </CardDescription>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleEditOption(option)}
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDeleteOption(option.id)}
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-semibold">Itens:</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCurrentOptionId(option.id);
                              setItemDialogOpen(true);
                            }}
                          >
                            <Plus size={16} className="mr-1" />
                            Adicionar Item
                          </Button>
                        </div>
                        {option.items.length === 0 ? (
                          <p className="text-sm text-muted-foreground">
                            Nenhum item adicionado
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {option.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between p-2 border rounded"
                              >
                                <div>
                                  <span className="font-medium">{item.name}</span>
                                  {item.price > 0 && (
                                    <span className="ml-2 text-sm text-muted-foreground">
                                      + R$ {item.price.toFixed(2)}
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => handleEditItem(item, option.id)}
                                  >
                                    <Pencil size={14} />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8"
                                    onClick={() => handleDeleteItem(item.id)}
                                  >
                                    <X size={14} />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            <Dialog open={itemDialogOpen} onOpenChange={(open) => {
              setItemDialogOpen(open);
              if (!open) resetItemForm();
            }}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingItem ? "Editar Item" : "Novo Item"}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label>Nome do Item *</Label>
                    <Input
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      placeholder="Ex: Tamanho G, Bacon, Morango"
                    />
                  </div>
                  <div>
                    <Label>Preço Adicional (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={itemPrice}
                      onChange={(e) => setItemPrice(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  <Button onClick={handleSaveItem} className="w-full">
                    {editingItem ? "Atualizar" : "Criar"} Item
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}
