import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Receipt, LogOut, Plus, Clock, User as UserIcon } from "lucide-react";
import { WaiterTabView } from "@/components/waiter/WaiterTabView";

export default function Waiter() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showTabView, setShowTabView] = useState(false);
  const [currentTabId, setCurrentTabId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      // Check if user has waiter role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id);
      
      if (roles?.some(r => r.role === "waiter")) {
        setIsAuthenticated(true);
        setUser(session.user);
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check waiter role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id);

      if (!roles?.some(r => r.role === "waiter")) {
        await supabase.auth.signOut();
        toast.error("Acesso negado. Você não tem permissão de garçom.");
        return;
      }

      setIsAuthenticated(true);
      setUser(data.user);
      toast.success("Login realizado com sucesso!");
    } catch (error: any) {
      toast.error(error.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setUser(null);
    setShowTabView(false);
    setCurrentTabId(null);
    toast.success("Logout realizado");
  };

  const handleNewTab = () => {
    setCurrentTabId(null);
    setShowTabView(true);
  };

  const handleEditTab = (tabId: string) => {
    setCurrentTabId(tabId);
    setShowTabView(true);
  };

  const handleBackToDashboard = () => {
    setShowTabView(false);
    setCurrentTabId(null);
  };

  if (isAuthenticated) {
    if (showTabView) {
      return (
        <div className="min-h-screen bg-background p-4">
          <WaiterTabView
            tabId={currentTabId}
            onBack={handleBackToDashboard}
            onSaved={() => {}}
            waiterId={user?.id}
          />
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card sticky top-0 z-10">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Painel do Garçom</h1>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={handleNewTab}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Comanda
              </Button>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <WaiterDashboard 
              userId={user?.id} 
              onEditTab={handleEditTab}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Receipt className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Acesso de Garçom</CardTitle>
          <CardDescription>
            Entre com suas credenciais para gerenciar comandas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Waiter Dashboard Component
interface WaiterDashboardProps {
  userId: string;
  onEditTab: (tabId: string) => void;
}

function WaiterDashboard({ userId, onEditTab }: WaiterDashboardProps) {
  const [openTabs, setOpenTabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [waiterProfile, setWaiterProfile] = useState<any>(null);

  useEffect(() => {
    loadWaiterProfile();
    loadOpenTabs();
    
    // Subscribe to realtime updates
    const channel = supabase
      .channel('open_tabs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'open_tabs'
        },
        () => loadOpenTabs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadWaiterProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single();
    
    setWaiterProfile(data);
  };

  const loadOpenTabs = async () => {
    try {
      const { data, error } = await supabase
        .from("open_tabs")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOpenTabs(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar comandas");
    } finally {
      setLoading(false);
    }
  };

  const deleteTab = async (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm("Deseja excluir esta comanda?")) return;

    try {
      const { error } = await supabase
        .from("open_tabs")
        .delete()
        .eq("id", tabId);

      if (error) throw error;
      toast.success("Comanda excluída");
      loadOpenTabs();
    } catch (error: any) {
      toast.error("Erro ao excluir comanda");
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando comandas...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-2">Comandas Abertas</h2>
          <p className="text-muted-foreground">
            Gerencie as comandas em aberto do restaurante
          </p>
        </div>
        {waiterProfile && (
          <Card>
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{waiterProfile.full_name}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {openTabs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">Nenhuma comanda aberta no momento</p>
            <p className="text-sm text-muted-foreground">
              Clique em "Nova Comanda" para iniciar um atendimento
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {openTabs.map((tab) => (
            <Card 
              key={tab.id} 
              className="hover:border-primary cursor-pointer transition-all hover:shadow-lg" 
              onClick={() => onEditTab(tab.id)}
            >
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5 text-primary" />
                    <span>#{tab.tab_number}</span>
                  </CardTitle>
                  <Badge variant="secondary">
                    {tab.items?.length || 0} itens
                  </Badge>
                </div>
                <CardDescription className="flex items-center gap-1">
                  <UserIcon className="h-3 w-3" />
                  {tab.customer_name || "Cliente não identificado"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tab.customer_phone && (
                    <p className="text-sm text-muted-foreground">
                      Tel: {tab.customer_phone}
                    </p>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-primary">
                      R$ {Number(tab.total_amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Aberta {new Date(tab.created_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    })}
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full"
                    onClick={(e) => deleteTab(tab.id, e)}
                  >
                    Excluir Comanda
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}