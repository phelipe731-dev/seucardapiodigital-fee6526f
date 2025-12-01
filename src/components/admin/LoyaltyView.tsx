import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Award, TrendingUp, Users, Search, Star, Trophy, Crown } from "lucide-react";

export default function LoyaltyView() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    bronze: 0,
    prata: 0,
    ouro: 0,
    totalPoints: 0
  });

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const filtered = customers.filter(c => 
        c.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.customer_phone?.includes(searchQuery)
      );
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [searchQuery, customers]);

  const loadCustomers = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!restaurant) return;

      const { data, error } = await supabase
        .from("loyalty_customers")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("points", { ascending: false });

      if (error) throw error;

      setCustomers(data || []);
      setFilteredCustomers(data || []);

      // Calculate stats
      const stats = {
        total: data?.length || 0,
        bronze: data?.filter(c => c.tier === 'bronze').length || 0,
        prata: data?.filter(c => c.tier === 'prata').length || 0,
        ouro: data?.filter(c => c.tier === 'ouro').length || 0,
        totalPoints: data?.reduce((sum, c) => sum + (c.points || 0), 0) || 0
      };
      setStats(stats);

    } catch (error: any) {
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'ouro': return <Crown className="h-5 w-5 text-yellow-500" />;
      case 'prata': return <Trophy className="h-5 w-5 text-gray-400" />;
      default: return <Star className="h-5 w-5 text-orange-600" />;
    }
  };

  const getTierBadgeVariant = (tier: string): "default" | "secondary" | "outline" => {
    switch (tier) {
      case 'ouro': return "default";
      case 'prata': return "secondary";
      default: return "outline";
    }
  };

  if (loading) {
    return <div className="text-center py-8">Carregando programa de fidelidade...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Programa de Fidelidade</h2>
        <p className="text-muted-foreground">
          Acompanhe e gerencie seus clientes fiéis
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pontos Totais</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPoints}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ouro</CardTitle>
            <Crown className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ouro}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Prata</CardTitle>
            <Trophy className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.prata}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tier Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Níveis de Fidelidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-5 w-5 text-orange-600" />
                <h3 className="font-semibold">Bronze</h3>
              </div>
              <p className="text-sm text-muted-foreground">0 - 499 pontos</p>
              <p className="text-xs mt-1">1 ponto a cada R$ 10</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="h-5 w-5 text-gray-400" />
                <h3 className="font-semibold">Prata</h3>
              </div>
              <p className="text-sm text-muted-foreground">500 - 999 pontos</p>
              <p className="text-xs mt-1">1 ponto a cada R$ 10</p>
            </div>
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <h3 className="font-semibold">Ouro</h3>
              </div>
              <p className="text-sm text-muted-foreground">1000+ pontos</p>
              <p className="text-xs mt-1">1 ponto a cada R$ 10</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={loadCustomers} variant="outline">
          Atualizar
        </Button>
      </div>

      {/* Customers List */}
      <Card>
        <CardHeader>
          <CardTitle>Clientes Cadastrados</CardTitle>
          <CardDescription>
            {filteredCustomers.length} {filteredCustomers.length === 1 ? "cliente" : "clientes"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredCustomers.length === 0 ? (
            <div className="text-center py-12">
              <Award className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                {searchQuery ? "Nenhum cliente encontrado" : "Nenhum cliente no programa ainda"}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {filteredCustomers.map((customer) => (
                  <Card key={customer.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTierIcon(customer.tier)}
                            <h3 className="font-semibold">
                              {customer.customer_name || "Cliente não identificado"}
                            </h3>
                            <Badge variant={getTierBadgeVariant(customer.tier)}>
                              {customer.tier.toUpperCase()}
                            </Badge>
                          </div>
                          <div className="space-y-1 text-sm">
                            <p className="text-muted-foreground">
                              📱 {customer.customer_phone}
                            </p>
                            <p className="font-medium text-primary">
                              ⭐ {customer.points} pontos
                            </p>
                            <p className="text-muted-foreground">
                              💰 Total gasto: R$ {Number(customer.total_spent).toFixed(2)}
                            </p>
                            <p className="text-muted-foreground">
                              🍽️ {customer.visit_count} {customer.visit_count === 1 ? "visita" : "visitas"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Cliente desde {new Date(customer.created_at).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
