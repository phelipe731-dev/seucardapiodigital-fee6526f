import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Clock, ChefHat, PackageCheck, XCircle } from "lucide-react";

interface Order {
  id: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

export default function OrderTracking() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("id");
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!orderId) {
      navigate("/");
      return;
    }

    loadOrder();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('order-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          setOrder(payload.new as Order);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, navigate]);

  const loadOrder = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("id", orderId)
        .single();

      if (error) throw error;
      setOrder(data);
    } catch (error: any) {
      console.error("Erro ao carregar pedido:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: "Aguardando Confirmação",
          icon: Clock,
          color: "bg-yellow-500",
          description: "Seu pedido foi recebido e está aguardando confirmação do restaurante."
        };
      case "confirmed":
        return {
          label: "Confirmado",
          icon: CheckCircle2,
          color: "bg-blue-500",
          description: "Seu pedido foi confirmado e será preparado em breve."
        };
      case "preparing":
        return {
          label: "Em Preparação",
          icon: ChefHat,
          color: "bg-orange-500",
          description: "Seu pedido está sendo preparado com carinho!"
        };
      case "ready":
        return {
          label: "Pronto para Retirada",
          icon: PackageCheck,
          color: "bg-green-500",
          description: "Seu pedido está pronto! Você pode retirá-lo agora."
        };
      case "completed":
        return {
          label: "Pedido Finalizado e Entregue",
          icon: CheckCircle2,
          color: "bg-gray-500",
          description: "Seu pedido foi concluído. Obrigado pela preferência!"
        };
      case "cancelled":
        return {
          label: "Cancelado",
          icon: XCircle,
          color: "bg-red-500",
          description: "Seu pedido foi cancelado. Entre em contato com o restaurante para mais informações."
        };
      default:
        return {
          label: status,
          icon: Clock,
          color: "bg-gray-400",
          description: ""
        };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Carregando pedido...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">Pedido não encontrado</p>
            <Button onClick={() => navigate("/")}>Voltar ao Início</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusInfo = getStatusInfo(order.status);
  const StatusIcon = statusInfo.icon;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Acompanhamento do Pedido</CardTitle>
            <CardDescription>
              Pedido realizado em {new Date(order.created_at).toLocaleString("pt-BR")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <div className={`${statusInfo.color} rounded-full p-6`}>
                  <StatusIcon size={48} className="text-white" />
                </div>
              </div>
              <div>
                <Badge className={`${statusInfo.color} text-lg py-2 px-4`}>
                  {statusInfo.label}
                </Badge>
              </div>
              <p className="text-muted-foreground">
                {statusInfo.description}
              </p>
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-semibold">{order.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-semibold text-primary text-lg">
                  R$ {order.total_amount.toFixed(2)}
                </span>
              </div>
            </div>

            {order.status === "completed" && (
              <div className="border-t pt-4">
                <Button 
                  variant="gradient" 
                  className="w-full"
                  onClick={() => navigate("/menu")}
                >
                  Fazer Novo Pedido
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Button 
            variant="outline" 
            onClick={() => navigate("/")}
          >
            Voltar ao Início
          </Button>
        </div>
      </div>
    </div>
  );
}
