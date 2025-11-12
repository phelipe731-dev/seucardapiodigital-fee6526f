import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Store, Package, List, QrCode, ShoppingBag } from "lucide-react";
import { RestaurantForm } from "@/components/admin/RestaurantForm";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { ProductsManager } from "@/components/admin/ProductsManager";
import { OrdersView } from "@/components/admin/OrdersView";
import { QRCodeView } from "@/components/admin/QRCodeView";
import PlansManager from "@/components/admin/PlansManager";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

export default function Admin() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso!");
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-primary text-white shadow-elevated">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Painel Administrativo</h1>
            <Button
              variant="secondary"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut size={18} />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="restaurant" className="space-y-8">
          <TabsList className="grid grid-cols-6 w-full max-w-4xl">
            <TabsTrigger value="restaurant" className="gap-2">
              <Store size={18} />
              Restaurante
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-2">
              <List size={18} />
              Categorias
            </TabsTrigger>
            <TabsTrigger value="products" className="gap-2">
              <Package size={18} />
              Produtos
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <ShoppingBag size={18} />
              Pedidos
            </TabsTrigger>
            <TabsTrigger value="plans" className="gap-2">
              <Package size={18} />
              Planos
            </TabsTrigger>
            <TabsTrigger value="qrcode" className="gap-2">
              <QrCode size={18} />
              QR Code
            </TabsTrigger>
          </TabsList>

          <TabsContent value="restaurant">
            <RestaurantForm />
          </TabsContent>

          <TabsContent value="categories">
            <CategoriesManager />
          </TabsContent>

          <TabsContent value="products">
            <ProductsManager />
          </TabsContent>

          <TabsContent value="orders">
            <OrdersView />
          </TabsContent>

          <TabsContent value="plans">
            <PlansManager />
          </TabsContent>

          <TabsContent value="qrcode">
            <QRCodeView />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
