import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, MessageSquare, TrendingUp, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Review {
  id: string;
  order_id: string;
  overall_rating: number;
  food_rating: number | null;
  service_rating: number | null;
  delivery_rating: number | null;
  comment: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  is_published: boolean;
  created_at: string;
}

export default function ReviewsManager() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    averageRating: 0,
    totalReviews: 0,
    fiveStars: 0,
    fourStars: 0,
    threeStars: 0,
    twoStars: 0,
    oneStar: 0,
  });

  useEffect(() => {
    loadReviews();
  }, []);

  const loadReviews = async () => {
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
        .from("order_reviews")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setReviews(data || []);
      calculateStats(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar avaliações: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (reviewsData: Review[]) => {
    const total = reviewsData.length;
    if (total === 0) {
      setStats({
        averageRating: 0,
        totalReviews: 0,
        fiveStars: 0,
        fourStars: 0,
        threeStars: 0,
        twoStars: 0,
        oneStar: 0,
      });
      return;
    }

    const sum = reviewsData.reduce((acc, r) => acc + r.overall_rating, 0);
    const avg = sum / total;

    const distribution = reviewsData.reduce((acc, r) => {
      acc[r.overall_rating] = (acc[r.overall_rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    setStats({
      averageRating: Math.round(avg * 10) / 10,
      totalReviews: total,
      fiveStars: distribution[5] || 0,
      fourStars: distribution[4] || 0,
      threeStars: distribution[3] || 0,
      twoStars: distribution[2] || 0,
      oneStar: distribution[1] || 0,
    });
  };

  const togglePublished = async (reviewId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("order_reviews")
        .update({ is_published: !currentStatus })
        .eq("id", reviewId);

      if (error) throw error;

      toast.success(currentStatus ? "Avaliação ocultada" : "Avaliação publicada");
      loadReviews();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Avaliações</h2>
        <p className="text-muted-foreground">
          Gerencie as avaliações dos seus clientes
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Média Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold">{stats.averageRating}</span>
              {renderStars(Math.round(stats.averageRating))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.totalReviews} avaliações
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Distribuição
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span>⭐⭐⭐⭐⭐</span>
              <span className="font-medium">{stats.fiveStars}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>⭐⭐⭐⭐</span>
              <span className="font-medium">{stats.fourStars}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span>⭐⭐⭐</span>
              <span className="font-medium">{stats.threeStars}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Avaliações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-muted-foreground" />
              <span className="text-2xl font-bold">{stats.totalReviews}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Publicadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <span className="text-2xl font-bold">
                {reviews.filter((r) => r.is_published).length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review) => (
          <Card key={review.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">
                      {review.customer_name || "Cliente"}
                    </span>
                    {!review.is_published && (
                      <Badge variant="secondary">Oculta</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(review.created_at), "dd/MM/yyyy 'às' HH:mm")}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => togglePublished(review.id, review.is_published)}
                >
                  {review.is_published ? (
                    <><EyeOff className="w-4 h-4 mr-2" /> Ocultar</>
                  ) : (
                    <><Eye className="w-4 h-4 mr-2" /> Publicar</>
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-4 flex-wrap">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Geral</p>
                  {renderStars(review.overall_rating)}
                </div>
                {review.food_rating && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Comida</p>
                    {renderStars(review.food_rating)}
                  </div>
                )}
                {review.service_rating && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Serviço</p>
                    {renderStars(review.service_rating)}
                  </div>
                )}
                {review.delivery_rating && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Entrega</p>
                    {renderStars(review.delivery_rating)}
                  </div>
                )}
              </div>

              {review.comment && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <p className="text-sm">{review.comment}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {reviews.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma avaliação ainda.</p>
              <p className="text-sm text-muted-foreground">
                As avaliações dos clientes aparecerão aqui
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
