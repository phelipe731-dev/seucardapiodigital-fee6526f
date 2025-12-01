import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Receipt, LogOut } from "lucide-react";

export default function Waiter() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

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
    toast.success("Logout realizado");
  };

  if (isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">Painel do Garçom</h1>
            </div>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Sair
            </Button>
          </div>
        </header>
        
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <WaiterDashboard userId={user?.id} />
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
function WaiterDashboard({ userId }: { userId: string }) {
  const [openTabs, setOpenTabs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  const viewTab = (tabId: string) => {
    window.location.href = `/admin?section=pos&tab=${tabId}`;
  };

  if (loading) {
    return <div className="text-center py-8">Carregando comandas...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Comandas Abertas</h2>
        <p className="text-muted-foreground">
          Gerencie as comandas em aberto do restaurante
        </p>
      </div>

      {openTabs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma comanda aberta no momento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {openTabs.map((tab) => (
            <Card key={tab.id} className="hover:border-primary cursor-pointer transition-colors" onClick={() => viewTab(tab.id)}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Comanda #{tab.tab_number}</span>
                  <Receipt className="h-5 w-5 text-primary" />
                </CardTitle>
                <CardDescription>
                  {tab.customer_name || "Cliente não identificado"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {tab.customer_phone && (
                    <p className="text-muted-foreground">Tel: {tab.customer_phone}</p>
                  )}
                  <p className="font-semibold text-lg">
                    R$ {Number(tab.total_amount).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tab.items?.length || 0} {tab.items?.length === 1 ? "item" : "itens"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Aberta em {new Date(tab.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
