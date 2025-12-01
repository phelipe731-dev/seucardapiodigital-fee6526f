import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";
import { toast } from "sonner";

export default function OrderReview() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ratings, setRatings] = useState({
    overall: 0,
    food: 0,
    service: 0,
    delivery: 0,
  });
  const [comment, setComment] = useState("");

  const handleStarClick = (category: keyof typeof ratings, value: number) => {
    setRatings({ ...ratings, [category]: value });
  };

  const renderStars = (category: keyof typeof ratings) => {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => handleStarClick(category, star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                star <= ratings[category]
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300 hover:text-yellow-200"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (ratings.overall === 0) {
      toast.error("Por favor, avalie pelo menos a experiência geral");
      return;
    }

    setLoading(true);

    try {
      // Buscar dados do pedido
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("restaurant_id, customer_name, customer_phone, waiter_id")
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Criar avaliação
      const { error } = await supabase
        .from("order_reviews")
        .insert([
          {
            order_id: orderId,
            restaurant_id: order.restaurant_id,
            waiter_id: order.waiter_id,
            overall_rating: ratings.overall,
            food_rating: ratings.food > 0 ? ratings.food : null,
            service_rating: ratings.service > 0 ? ratings.service : null,
            delivery_rating: ratings.delivery > 0 ? ratings.delivery : null,
            comment: comment.trim() || null,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            is_published: true,
          },
        ]);

      if (error) throw error;

      toast.success("Obrigado pela sua avaliação!");
      setTimeout(() => navigate("/"), 2000);
    } catch (error: any) {
      toast.error("Erro ao enviar avaliação: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <CardTitle className="text-2xl">Avalie seu Pedido</CardTitle>
          <CardDescription>
            Sua opinião é muito importante para nós!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label>Experiência Geral *</Label>
              {renderStars("overall")}
            </div>

            <div className="space-y-2">
              <Label>Qualidade da Comida</Label>
              {renderStars("food")}
            </div>

            <div className="space-y-2">
              <Label>Atendimento</Label>
              {renderStars("service")}
            </div>

            <div className="space-y-2">
              <Label>Entrega (se aplicável)</Label>
              {renderStars("delivery")}
            </div>

            <div className="space-y-2">
              <Label htmlFor="comment">Comentário (opcional)</Label>
              <Textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Conte-nos mais sobre sua experiência..."
                rows={4}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar Avaliação"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
