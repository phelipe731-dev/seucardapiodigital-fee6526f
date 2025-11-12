import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Phone, User } from "lucide-react";
import { toast } from "sonner";

interface Order {
  id: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  payment_method: string;
  notes: string;
  status: string;
  created_at: string;
}

export function OrdersView() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrdersCountRef = useRef<number>(0);

  useEffect(() => {
    // Create audio element for notification sound
    audioRef.current = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OWhUA0PVqzn77BdGAg+ltryxnMpBSl+zPLaizsIHGyv8eSbSwwMUKXh8LJeHAU2jdXw0HswBSeAyvDdlT4KFmS36+yeUhENTKPi8bVeGAg6kdXwyXEqBSh9yfDdk0IJGW2w7+SZSgwMUKfi8LFcHAY4jtXw0HgwBSeAyfDdlT4KFWOz6+yfUhENTKPi8bVeGAg6ktXwyXAqBSl9yfDdlEIJGm6x7+SZTA0LUafi8LFcHAY4jtXwz3gwBSiAyPDdlT4KFmS26+yfUhEMTKPh8bVeGAg6kdXwyXEqBSh9yPDdlEIJGG2w8OSaSgwMUqji8LFcHAY3jtXw0HgwBSh/yPDdlD4JFmS26+yeUhENTKPh8bVeGQg6kdXwyXAqBSl+yPDdlEIJGm+x7+SaSg0LUafi8LFcGwY3jtXw0HgvBSh/yPDdlD4KFmS26+yeUhENTKPh8bVeGAg6kdXwyXAqBSl+yPDdlEIJGW+x7+SaSg0LUafi8LFcGwY4j9Tw0HgvBSh/yPDdlD4KFmS26+yfUhENTKPh8bVeGQg6kdXwyXAqBSl+yPDdlEIJGm+w7+SaSg0LUafi8LJcGwY3jtXw0HgvBSh/yPDdlD4JFmS26+yfUhENTKPh8bVeGQg6kdXwyXAqBSl+yPDdlEIJGm+x7+SaSg0LUafi8LFcGwY3jtXw0HgwBSh/yPDdlT4JFmS26+yfUhENTKPh8bVeGQg6kdXwyXAqBSl+yPDdlEIJGm+x7+SaSg0LUafi8LFcGwY3jtXw0HgwBSh/yPDdlT4JFmO36+yfUhENTKPh8bVeGQg6kdXwyXAqBSl+yPDdlEIJGm+x7+SaSg0LUafi8LFcGwY3jtXw0HgwBSh/yPDdlT4JFmO36+yfUhENTKPh8bVeGQg6kdXwyXAqBSl+yPDdlEIJGm+x8OSaSg0LUafi8LFcGwY3jtXw0HgwBSh/yPDdlT4JFmO36+yfUhENTKPh8bVeGQg6kdXwyXAqBSl9yPDdlEIJGm+x8OSaSg0LUafi8LFcGwY3jtXw0HgwBSh/yPDdlT4JFmO36+yfUhENTKPh8bVeGQg6kdXwyXAqBSl9yPDdlEIJGm+x8OSaSg0LUqfi8LFcGwY3jtXw0HgwBSh/yPDdlT4JFmO36+yfUhENTKPh8bVeGQg6kdXwyXAqBSl9yPDdlEIJGm+x8OSaSg0LUqfi8LFcGwY3jtXw0HgwBSh/yPDdlT4JFmO36+yfUhENTKPh8bVeGQg6kdXwyXAqBSl9yPDdlEIJGm+x8OSaSg0LUqfi8LFcGwY3jtXw0HgwBSh/yPDdlT4JFmO26+yfUhENTKPh8bVeGQg6kdXwyXAqBSl9yPDdlEIJGm+x8OSaSg0LUqfi8LFcGwY3jtXw0HgwBSh/yPDdlT4JFmO26+yfUhENTKPh8bVeGQg6kdXwyXAqBSl9yPDdlEIJGm+x8OSaSg0LUqfi8LFcGwY3jtXw0HgwBSh/yPDdlT4JFmO26+yfUhENTKPh8bVeGQg6kdXwyXAqBSl9yPDdlEIJGm+x8OSaSg0LUqfi8LFcGwY3jtXw0HgwBSh/yPDdlT4JFmO26+yfUhENTKPh8bVeGQg6kdXwyXAqBSl9yPDdlEIJGm+x8OSaSg0LUqfi8LFcGwY3jtXw0HgwBSh/yPDdlT4JFmO26+yfUhENTKPh8bVeGQg6kdXwyXAqBSl9yPDdlEIJGm+x8OSaSg0LUqfi8A==');
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    loadOrders();

    // Subscribe to realtime updates for new orders
    const channel = supabase
      .channel('order-inserts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          const newOrder = payload.new as Order;
          setOrders(prev => [newOrder, ...prev]);
          
          // Play notification sound
          if (audioRef.current) {
            audioRef.current.play().catch(err => console.error('Error playing sound:', err));
          }
          
          // Show browser notification
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Novo Pedido Recebido! 🔔', {
              body: `${newOrder.customer_name} - R$ ${newOrder.total_amount.toFixed(2)}`,
              icon: '/favicon.ico',
              tag: newOrder.id
            });
          }
          
          // Show toast notification
          toast.success('Novo pedido recebido!', {
            description: `${newOrder.customer_name} - R$ ${newOrder.total_amount.toFixed(2)}`,
            duration: 5000
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadOrders = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!restaurant) {
        toast.error("Configure seu restaurante primeiro");
        return;
      }

      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar pedidos:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status })
        .eq("id", orderId);

      if (error) throw error;
      toast.success("Status atualizado!");
      loadOrders();
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar status");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-500";
      case "confirmed": return "bg-blue-500";
      case "preparing": return "bg-orange-500";
      case "ready": return "bg-green-500";
      case "completed": return "bg-gray-500";
      case "cancelled": return "bg-red-500";
      default: return "bg-gray-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "pending": return "Pendente";
      case "confirmed": return "Confirmado";
      case "preparing": return "Preparando";
      case "ready": return "Pronto";
      case "completed": return "Concluído";
      case "cancelled": return "Cancelado";
      default: return status;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground">Carregando pedidos...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Pedidos Recebidos</CardTitle>
        <CardDescription>
          Gerencie os pedidos do seu restaurante
        </CardDescription>
      </CardHeader>
      <CardContent>
        {orders.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum pedido recebido ainda
          </p>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User size={18} className="text-muted-foreground" />
                      <span className="font-semibold">{order.customer_name}</span>
                    </div>
                    {order.customer_phone && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone size={16} />
                        <span>{order.customer_phone}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock size={16} />
                      <span>{new Date(order.created_at).toLocaleString("pt-BR")}</span>
                    </div>
                  </div>
                  <Badge className={getStatusColor(order.status)}>
                    {getStatusLabel(order.status)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Pagamento:</span>
                    <p className="font-medium">{order.payment_method}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total:</span>
                    <p className="font-semibold text-primary text-lg">
                      R$ {order.total_amount.toFixed(2)}
                    </p>
                  </div>
                </div>

                {order.notes && (
                  <div className="text-sm">
                    <span className="text-muted-foreground">Observações:</span>
                    <p className="mt-1">{order.notes}</p>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Atualizar status:</span>
                  <Select
                    value={order.status}
                    onValueChange={(value) => updateOrderStatus(order.id, value)}
                  >
                    <SelectTrigger className="w-[200px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="confirmed">Confirmado</SelectItem>
                      <SelectItem value="preparing">Preparando</SelectItem>
                      <SelectItem value="ready">Pronto</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="cancelled">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
