import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LogOut, Store, Package, List, QrCode, ShoppingBag, BarChart3, MapPin, Palette, Settings, MessageCircle, Printer, Search, Menu, Crown, HelpCircle, CreditCard, Award, Users, Tag, Gift, Calendar, Star } from "lucide-react";
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
import { POSView } from "@/components/admin/POSView";
import LoyaltyView from "@/components/admin/LoyaltyView";
import WaitersManager from "@/components/admin/WaitersManager";
import CouponsManager from "@/components/admin/CouponsManager";
import LoyaltyRewardsManager from "@/components/admin/LoyaltyRewardsManager";
import CombosManager from "@/components/admin/CombosManager";
import ReviewsManager from "@/components/admin/ReviewsManager";
import AdvancedAnalytics from "@/components/admin/AdvancedAnalytics";
import TablesManager from "@/components/admin/TablesManager";
import ReservationsManager from "@/components/admin/ReservationsManager";
import DailyDealsManager from "@/components/admin/DailyDealsManager";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger, SidebarHeader, useSidebar } from "@/components/ui/sidebar";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Dashboard", icon: BarChart3, section: "dashboard", category: "Principal" },
  { title: "PDV", icon: CreditCard, section: "pos", category: "Principal" },
  { title: "Pedidos", icon: ShoppingBag, section: "orders", category: "Principal" },
  { title: "Fidelidade", icon: Award, section: "loyalty", category: "Principal" },
  { title: "Garçons", icon: Users, section: "waiters", category: "Principal" },
  { title: "Cupons", icon: Tag, section: "coupons", category: "Marketing" },
  { title: "Recompensas", icon: Gift, section: "rewards", category: "Marketing" },
  { title: "Combos", icon: Package, section: "combos", category: "Marketing" },
  { title: "Promoção do Dia", icon: Star, section: "daily-deals", category: "Marketing" },
  { title: "Avaliações", icon: MessageCircle, section: "reviews", category: "Marketing" },
  { title: "Analytics", icon: BarChart3, section: "analytics", category: "Marketing" },
  { title: "Produtos", icon: Package, section: "products", category: "Catálogo" },
  { title: "Categorias", icon: List, section: "categories", category: "Catálogo" },
  { title: "Opcionais", icon: Settings, section: "options", category: "Catálogo" },
  { title: "Delivery", icon: MapPin, section: "delivery", category: "Operação" },
  { title: "Mesas", icon: Users, section: "tables", category: "Operação" },
  { title: "Reservas", icon: Calendar, section: "reservations", category: "Operação" },
  { title: "WhatsApp", icon: MessageCircle, section: "whatsapp", category: "Operação" },
  { title: "Impressora", icon: Printer, section: "printer", category: "Operação" },
  { title: "Restaurante", icon: Store, section: "restaurant", category: "Configurações" },
  { title: "Tema", icon: Palette, section: "theme", category: "Configurações" },
  { title: "QR Code", icon: QrCode, section: "qrcode", category: "Configurações" },
  { title: "Planos", icon: Package, section: "plans", category: "Configurações" },
];

export default function Admin() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [restaurant, setRestaurant] = useState<any>(null);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [inactiveProducts, setInactiveProducts] = useState(0);
  const [subscription, setSubscription] = useState<any>(null);
  const activeSection = searchParams.get("section") || "dashboard";

  const filteredMenuItems = menuItems.filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedMenuItems = filteredMenuItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, typeof menuItems>);

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

  useEffect(() => {
    if (user) {
      // Fetch restaurant data
      supabase
        .from("restaurants")
        .select("*")
        .eq("owner_id", user.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setRestaurant(data);
            
            // Fetch pending orders count
            supabase
              .from("orders")
              .select("id", { count: "exact", head: true })
              .eq("restaurant_id", data.id)
              .eq("status", "pending")
              .then(({ count }) => setPendingOrders(count || 0));
            
            // Fetch inactive products count
            supabase
              .from("products")
              .select("id", { count: "exact", head: true })
              .eq("restaurant_id", data.id)
              .eq("is_active", false)
              .then(({ count }) => setInactiveProducts(count || 0));
          }
        });
      
      // Fetch user subscription
      supabase
        .from("user_subscriptions")
        .select(`
          *,
          subscription_plans (
            name,
            duration_days
          )
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("end_date", { ascending: false })
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            setSubscription(data);
          }
        });
    }
  }, [user]);

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
      case "pos":
        return <POSView />;
      case "loyalty":
        return <LoyaltyView />;
      case "waiters":
        return <WaitersManager />;
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
      case "coupons":
        if (!restaurant?.id) {
          return (
            <div className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          );
        }
        return <CouponsManager restaurantId={restaurant.id} />;
      case "rewards":
        if (!restaurant?.id) {
          return (
            <div className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          );
        }
        return <LoyaltyRewardsManager restaurantId={restaurant.id} />;
      case "combos":
        if (!restaurant?.id) {
          return (
            <div className="flex items-center justify-center p-8">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          );
        }
        return <CombosManager restaurantId={restaurant.id} />;
      case "daily-deals":
        return <DailyDealsManager />;
      case "reviews":
        return <ReviewsManager />;
      case "analytics":
        return <AdvancedAnalytics />;
      case "tables":
        return <TablesManager />;
      case "reservations":
        return <ReservationsManager />;
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
        <Sidebar collapsible="icon" className="border-r bg-card">
          <SidebarHeader className="border-b px-4 py-4 space-y-3">
            <div className="flex items-center gap-3">
              {restaurant?.logo_url ? (
                <img 
                  src={restaurant.logo_url} 
                  alt={restaurant.name} 
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Store className="h-5 w-5" />
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-sm font-semibold">{restaurant?.name || "Admin Panel"}</span>
                <span className="text-xs text-muted-foreground">Gerenciamento</span>
              </div>
            </div>
            
            {/* Subscription Info */}
            {subscription && (
              <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Crown className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground">
                    {subscription.subscription_plans?.name || "Plano Ativo"}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Expira em: {new Date(subscription.end_date).toLocaleDateString("pt-BR")}
                </div>
              </div>
            )}
            
            {/* Support Button */}
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-xs"
              onClick={() => window.open(`https://wa.me/5511999999999?text=Olá, preciso de ajuda com o painel administrativo`, "_blank")}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              Suporte via WhatsApp
            </Button>
          </SidebarHeader>
          
          <SidebarContent className="px-2 py-4">
            {/* Search */}
            <div className="px-2 pb-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 bg-background"
                />
              </div>
            </div>

            {/* Menu Groups */}
            {Object.entries(groupedMenuItems).map(([category, items]) => (
              <SidebarGroup key={category} className="mb-4">
                <SidebarGroupLabel className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {category}
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu className="space-y-1">
                    {items.map((item) => {
                      const isActive = activeSection === item.section;
                      
                      // Get badge count for specific sections
                      let badgeCount = 0;
                      if (item.section === "orders") {
                        badgeCount = pendingOrders;
                      } else if (item.section === "products") {
                        badgeCount = inactiveProducts;
                      }
                      
                      return (
                        <SidebarMenuItem key={item.section}>
                          <SidebarMenuButton asChild>
                            <NavLink
                              to={`/admin?section=${item.section}`}
                              className={cn(
                                "flex items-center gap-3 rounded-lg px-3 py-2.5 transition-all",
                                "hover:bg-accent hover:text-accent-foreground",
                                isActive && "bg-primary text-primary-foreground font-medium shadow-sm"
                              )}
                            >
                              <item.icon className="h-4 w-4 shrink-0" />
                              <span className="truncate flex-1">{item.title}</span>
                              {badgeCount > 0 && (
                                <Badge 
                                  variant={isActive ? "secondary" : "default"}
                                  className="ml-auto h-5 px-1.5 text-xs"
                                >
                                  {badgeCount}
                                </Badge>
                              )}
                            </NavLink>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}

            {searchQuery && filteredMenuItems.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                Nenhum resultado encontrado
              </div>
            )}
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6">
            <SidebarTrigger className="hover:bg-accent">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <div className="flex-1">
              <h1 className="text-lg font-semibold">
                {menuItems.find(item => item.section === activeSection)?.title || "Dashboard"}
              </h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </header>

          <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
            <div className="mx-auto max-w-7xl">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
