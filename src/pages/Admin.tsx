import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut, Store, Package, List, QrCode, ShoppingBag, BarChart3, MapPin, Palette, Settings, MessageCircle, Printer } from "lucide-react";
import { RestaurantForm } from "@/components/admin/RestaurantForm";
import { CategoriesManager } from "@/components/admin/CategoriesManager";
import { ProductsManager } from "@/components/admin/ProductsManager";
import { ProductOptionsManager } from "@/components/admin/ProductOptionsManager";
import { OrdersView } from "@/components/admin/OrdersView";
import { QRCodeView } from "@/components/admin/QRCodeView";
import { WhatsAppConnection } from "@/components/admin/WhatsAppConnection";
import PlansManager from "@/components/admin/PlansManager";
import DashboardStats from "@/components/admin/DashboardStats";
import DeliveryZonesManager from "@/components/admin/DeliveryZonesManager";
import ThemeCustomizer from "@/components/admin/ThemeCustomizer";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger } from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";

const menuItems = [
  { title: "Dashboard", icon: BarChart3, section: "dashboard" },
  { title: "Restaurante", icon: Store, section: "restaurant" },
  { title: "Categorias", icon: List, section: "categories" },
  { title: "Produtos", icon: Package, section: "products" },
  { title: "Opcionais", icon: Settings, section: "options" },
  { title: "Delivery", icon: MapPin, section: "delivery" },
  { title: "Pedidos", icon: ShoppingBag, section: "orders" },
  { title: "WhatsApp", icon: MessageCircle, section: "whatsapp" },
  { title: "Tema", icon: Palette, section: "theme" },
  { title: "Planos", icon: Package, section: "plans" },
  { title: "QR Code", icon: QrCode, section: "qrcode" },
  { title: "Impressora", icon: Printer, section: "printer" },
];

export default function Admin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const activeSection = searchParams.get("section") || "dashboard";

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

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <DashboardStats />;
      case "restaurant":
        return <RestaurantForm />;
      case "categories":
        return <CategoriesManager />;
      case "products":
        return <ProductsManager />;
      case "options":
        return <ProductOptionsManager />;
      case "delivery":
        return <DeliveryZonesManager />;
      case "orders":
        return <OrdersView />;
      case "whatsapp":
        return <WhatsAppConnection />;
      case "theme":
        return <ThemeCustomizer />;
      case "plans":
        return <PlansManager />;
      case "qrcode":
        return <QRCodeView />;
      case "printer":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-4">Sistema de Impressão</h2>
              <p className="text-muted-foreground mb-6">
                Configure a impressora térmica para impressão automática de pedidos.
              </p>
            </div>
            <Button
              onClick={() => navigate("/admin/printer")}
              className="w-full sm:w-auto"
            >
              <Printer className="w-4 h-4 mr-2" />
              Abrir Configurações da Impressora
            </Button>
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">📝 Instruções</h3>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Configure o worker Node.js (consulte printer-worker/README.md)</li>
                <li>Obtenha o IP da sua impressora térmica</li>
                <li>Configure na tela de configurações</li>
                <li>Teste a impressão</li>
                <li>Novos pedidos serão impressos automaticamente!</li>
              </ol>
            </div>
          </div>
        );
      default:
        return <DashboardStats />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar collapsible="icon" className="border-r">
          <SidebarContent>
            <SidebarGroup>
              <div className="px-3 py-2">
                <h2 className="mb-2 px-4 text-lg font-semibold">Admin</h2>
              </div>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.section}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={`/admin?section=${item.section}`}
                          className="flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:bg-accent"
                          activeClassName="bg-accent text-accent-foreground font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <div className="flex-1">
              <h1 className="text-xl font-semibold">Painel Administrativo</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut size={18} />
              Sair
            </Button>
          </header>

          <main className="flex-1 overflow-y-auto p-6">
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
