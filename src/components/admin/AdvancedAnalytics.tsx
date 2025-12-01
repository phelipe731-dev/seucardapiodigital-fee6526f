import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { TrendingUp, Package, DollarSign, Clock } from "lucide-react";
import { toast } from "sonner";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, subDays } from "date-fns";

export default function AdvancedAnalytics() {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [peakHours, setPeakHours] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    averageTicket: 0,
    topHour: "",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  const loadAnalytics = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!restaurant) return;

      const now = new Date();
      const startDate = period === "week" ? startOfWeek(now) : startOfMonth(now);
      const endDate = period === "week" ? endOfWeek(now) : endOfMonth(now);

      // Carregar pedidos do período
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            product_id,
            quantity,
            unit_price,
            products (name)
          )
        `)
        .eq("restaurant_id", restaurant.id)
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString())
        .eq("status", "completed");

      if (error) throw error;

      processAnalytics(orders || []);
    } catch (error: any) {
      toast.error("Erro ao carregar analytics: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const processAnalytics = (orders: any[]) => {
    // Calcular estatísticas gerais
    const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
    const totalOrders = orders.length;
    const averageTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Processar vendas por dia
    const salesByDay: Record<string, number> = {};
    orders.forEach((order) => {
      const day = format(new Date(order.created_at), "dd/MM");
      salesByDay[day] = (salesByDay[day] || 0) + Number(order.total_amount);
    });

    const salesChartData = Object.entries(salesByDay).map(([day, amount]) => ({
      day,
      vendas: Math.round(amount),
    }));

    // Top produtos
    const productSales: Record<string, { name: string; quantity: number; revenue: number }> = {};
    orders.forEach((order) => {
      order.order_items?.forEach((item: any) => {
        const productName = item.products?.name || "Produto";
        if (!productSales[item.product_id]) {
          productSales[item.product_id] = { name: productName, quantity: 0, revenue: 0 };
        }
        productSales[item.product_id].quantity += item.quantity;
        productSales[item.product_id].revenue += item.quantity * Number(item.unit_price);
      });
    });

    const topProductsData = Object.values(productSales)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((p) => ({
        name: p.name.length > 20 ? p.name.substring(0, 20) + "..." : p.name,
        quantidade: p.quantity,
        receita: Math.round(p.revenue),
      }));

    // Horários de pico
    const ordersByHour: Record<string, number> = {};
    orders.forEach((order) => {
      const hour = format(new Date(order.created_at), "HH:00");
      ordersByHour[hour] = (ordersByHour[hour] || 0) + 1;
    });

    const peakHoursData = Object.entries(ordersByHour)
      .map(([hour, count]) => ({ hora: hour, pedidos: count }))
      .sort((a, b) => parseInt(a.hora) - parseInt(b.hora));

    const topHour = Object.entries(ordersByHour).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

    setStats({
      totalRevenue,
      totalOrders,
      averageTicket,
      topHour,
    });
    setSalesData(salesChartData);
    setTopProducts(topProductsData);
    setPeakHours(peakHoursData);
  };

  if (loading) {
    return <div className="text-center py-8">Carregando analytics...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Analytics Avançado</h2>
          <p className="text-muted-foreground">Análise detalhada de vendas e performance</p>
        </div>
        <Select value={period} onValueChange={(v: any) => setPeriod(v)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Esta Semana</SelectItem>
            <SelectItem value="month">Este Mês</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-2xl font-bold">
                {stats.totalRevenue.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Pedidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Package className="w-4 h-4 text-blue-600" />
              <span className="text-2xl font-bold">{stats.totalOrders}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ticket Médio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-600" />
              <span className="text-2xl font-bold">
                {stats.averageTicket.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Horário de Pico
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-600" />
              <span className="text-2xl font-bold">{stats.topHour}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Vendas por Dia</CardTitle>
          <CardDescription>Evolução das vendas no período</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="vendas" stroke="#DC2626" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Products */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Produtos Mais Vendidos</CardTitle>
          <CardDescription>Produtos com maior receita</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={topProducts} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="name" type="category" width={150} />
              <Tooltip />
              <Legend />
              <Bar dataKey="receita" fill="#DC2626" name="Receita (R$)" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Peak Hours */}
      <Card>
        <CardHeader>
          <CardTitle>Horários de Maior Movimento</CardTitle>
          <CardDescription>Distribuição de pedidos ao longo do dia</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hora" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="pedidos" fill="#EA580C" name="Pedidos" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
