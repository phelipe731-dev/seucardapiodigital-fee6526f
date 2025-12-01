import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
  Trophy, 
  TrendingUp, 
  Star, 
  ShoppingCart, 
  Receipt,
  ExternalLink,
  Crown,
  Award,
  Medal
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface WaiterStats {
  waiter_id: string;
  waiter_name: string;
  total_sales: number;
  total_orders: number;
  total_tabs: number;
  avg_rating: number;
  rating_count: number;
}

export default function WaiterRankings() {
  const [stats, setStats] = useState<WaiterStats[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadWaiterStats();
  }, []);

  const loadWaiterStats = async () => {
    try {
      // Get current restaurant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!restaurant) throw new Error("Restaurante não encontrado");

      // Get all waiters
      const { data: waiters } = await supabase
        .from("user_roles")
        .select(`
          user_id,
          profiles!inner(full_name)
        `)
        .eq("role", "waiter");

      if (!waiters || waiters.length === 0) {
        setStats([]);
        return;
      }

      // Get stats for each waiter
      const waiterStats = await Promise.all(
        waiters.map(async (waiter) => {
          // Get orders completed by this waiter
          const { data: orders } = await supabase
            .from("orders")
            .select("total_amount")
            .eq("restaurant_id", restaurant.id)
            .eq("waiter_id", waiter.user_id)
            .eq("status", "completed");

          // Get tabs created by this waiter
          const { data: tabs } = await supabase
            .from("open_tabs")
            .select("id")
            .eq("restaurant_id", restaurant.id)
            .eq("waiter_id", waiter.user_id);

          // Get ratings for this waiter
          const { data: ratings } = await supabase
            .from("waiter_ratings")
            .select("rating")
            .eq("restaurant_id", restaurant.id)
            .eq("waiter_id", waiter.user_id);

          const totalSales = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
          const totalOrders = orders?.length || 0;
          const totalTabs = tabs?.length || 0;
          const avgRating = ratings?.length 
            ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length 
            : 0;

          return {
            waiter_id: waiter.user_id,
            waiter_name: (waiter.profiles as any)?.full_name || "Garçom",
            total_sales: totalSales,
            total_orders: totalOrders,
            total_tabs: totalTabs,
            avg_rating: avgRating,
            rating_count: ratings?.length || 0,
          };
        })
      );

      // Sort by total sales descending
      waiterStats.sort((a, b) => b.total_sales - a.total_sales);
      setStats(waiterStats);
    } catch (error: any) {
      toast.error("Erro ao carregar estatísticas: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Award className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Medal className="h-5 w-5 text-orange-600" />;
    return <Trophy className="h-4 w-4 text-muted-foreground" />;
  };

  const getRankBadge = (index: number) => {
    if (index === 0) return <Badge className="bg-yellow-500 text-white">1º Lugar</Badge>;
    if (index === 1) return <Badge className="bg-gray-400 text-white">2º Lugar</Badge>;
    if (index === 2) return <Badge className="bg-orange-600 text-white">3º Lugar</Badge>;
    return <Badge variant="outline">{index + 1}º</Badge>;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const topStats = {
    totalSales: stats.reduce((sum, s) => sum + s.total_sales, 0),
    totalOrders: stats.reduce((sum, s) => sum + s.total_orders, 0),
    totalTabs: stats.reduce((sum, s) => sum + s.total_tabs, 0),
    avgRating: stats.length > 0 
      ? stats.reduce((sum, s) => sum + s.avg_rating, 0) / stats.length 
      : 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Ranking de Garçons</h2>
          <p className="text-muted-foreground">
            Acompanhe o desempenho de vendas, comandas e avaliações
          </p>
        </div>
        
        <Button 
          onClick={() => navigate("/waiter")} 
          className="gap-2"
          variant="outline"
        >
          <ExternalLink className="h-4 w-4" />
          Acessar Login de Garçons
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Vendas Totais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {topStats.totalSales.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4" />
              Pedidos Totais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topStats.totalOrders}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Receipt className="h-4 w-4" />
              Comandas Totais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{topStats.totalTabs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Star className="h-4 w-4" />
              Avaliação Média
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topStats.avgRating.toFixed(1)} ⭐
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rankings Table */}
      {stats.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Trophy className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum dado disponível</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Os garçons ainda não realizaram vendas
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Ranking Completo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-16">Posição</TableHead>
                  <TableHead>Garçom</TableHead>
                  <TableHead className="text-right">Vendas</TableHead>
                  <TableHead className="text-right">Pedidos</TableHead>
                  <TableHead className="text-right">Comandas</TableHead>
                  <TableHead className="text-right">Avaliação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.map((waiter, index) => (
                  <TableRow key={waiter.waiter_id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getRankIcon(index)}
                        <span className="font-semibold">{index + 1}º</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{waiter.waiter_name}</span>
                        {index < 3 && getRankBadge(index)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      R$ {waiter.total_sales.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right">
                      {waiter.total_orders}
                    </TableCell>
                    <TableCell className="text-right">
                      {waiter.total_tabs}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {waiter.avg_rating > 0 ? (
                          <>
                            <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                            <span className="font-medium">
                              {waiter.avg_rating.toFixed(1)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              ({waiter.rating_count})
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}