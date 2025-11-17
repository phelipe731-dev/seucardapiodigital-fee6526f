import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, Clock, CheckCircle2, XCircle, ChefHat, PackageCheck } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  payment_method: string;
}

export default function OrderHistory() {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!phone.trim()) {
      toast.error("Digite seu telefone para buscar pedidos");
      return;
    }

    setLoading(true);
    setSearched(true);

    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("customer_phone", phone.trim())
        .order("created_at", { ascending: false });

      if (error) throw error;

      setOrders(data || []);
      
      if (!data || data.length === 0) {
        toast.info("Nenhum pedido encontrado com este telefone");
      }
    } catch (error: any) {
      console.error("Erro ao buscar pedidos:", error);
      toast.error("Erro ao buscar pedidos. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Aguardando",
          icon: Clock,
          color: "bg-yellow-500",
        };
      case "confirmed":
        return {
          label: "Confirmado",
          icon: CheckCircle2,
          color: "bg-blue-500",
        };
      case "preparing":
        return {
          label: "Preparando",
          icon: ChefHat,
          color: "bg-orange-500",
        };
      case "ready":
        return {
          label: "Pronto",
          icon: PackageCheck,
          color: "bg-green-500",
        };
      case "out_for_delivery":
        return {
          label: "Saiu p/ Entrega",
          icon: PackageCheck,
          color: "bg-purple-500",
        };
      case "completed":
        return {
          label: "Concluído",
          icon: CheckCircle2,
          color: "bg-gray-500",
        };
      case "cancelled":
        return {
          label: "Cancelado",
          icon: XCircle,
          color: "bg-red-500",
        };
      default:
        return {
          label: status,
          icon: Clock,
          color: "bg-gray-400",
        };
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Histórico de Pedidos</CardTitle>
            <CardDescription>
              Digite seu telefone para ver seus pedidos anteriores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                type="tel"
                placeholder="Digite seu telefone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={loading}>
                <Search className="mr-2 h-4 w-4" />
                {loading ? "Buscando..." : "Buscar"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {searched && orders.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">
                Nenhum pedido encontrado com este telefone
              </p>
            </CardContent>
          </Card>
        )}

        {orders.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">
              {orders.length} {orders.length === 1 ? "pedido encontrado" : "pedidos encontrados"}
            </h2>
            
            {orders.map((order) => {
              const statusInfo = getStatusInfo(order.status);
              const StatusIcon = statusInfo.icon;

              return (
                <Card 
                  key={order.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(`/pedido?id=${order.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <div className={`${statusInfo.color} rounded-full p-2`}>
                            <StatusIcon size={16} className="text-white" />
                          </div>
                          <Badge className={`${statusInfo.color}`}>
                            {statusInfo.label}
                          </Badge>
                        </div>
                        
                        <div>
                          <p className="font-semibold">{order.customer_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(order.created_at).toLocaleString("pt-BR")}
                          </p>
                        </div>

                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-muted-foreground">
                            Pagamento: {order.payment_method}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          R$ {order.total_amount.toFixed(2)}
                        </p>
                        <Button variant="ghost" size="sm" className="mt-2">
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => navigate("/menu")}
          >
            Voltar ao Cardápio
          </Button>
        </div>
      </div>
    </div>
  );
}
