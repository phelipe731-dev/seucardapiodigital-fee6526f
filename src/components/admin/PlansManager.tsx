import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SubscriptionPaymentCheckout } from "@/components/payment/SubscriptionPaymentCheckout";
import { Tables } from "@/integrations/supabase/types";

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  duration_days: number;
  max_products: number | null;
  max_categories: number | null;
}

interface Subscription {
  id: string;
  plan_id: string;
  start_date: string;
  end_date: string;
  is_active: boolean;
  subscription_plans: Plan;
}

export default function PlansManager() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [currentSubscription, setCurrentSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  useEffect(() => {
    loadPlansAndSubscription();
  }, []);

  const loadPlansAndSubscription = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get restaurant ID
      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .single();
      
      if (restaurant) {
        setRestaurantId(restaurant.id);
      }

      const { data: plansData, error: plansError } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price", { ascending: true });

      if (plansError) throw plansError;
      setPlans(plansData || []);

      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from("user_subscriptions")
        .select(`
          *,
          subscription_plans (*)
        `)
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (subscriptionError && subscriptionError.code !== "PGRST116") {
        console.error("Subscription error:", subscriptionError);
      } else {
        setCurrentSubscription(subscriptionData);
      }
    } catch (error) {
      console.error("Error loading plans:", error);
      toast.error("Erro ao carregar planos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = (plan: Plan) => {
    // For free plans (price = 0), activate directly
    if (plan.price === 0) {
      activateFreePlan(plan);
      return;
    }

    // For paid plans, show payment dialog
    setSelectedPlan(plan);
    setShowPaymentDialog(true);
  };

  const activateFreePlan = async (plan: Plan) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        return;
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + plan.duration_days);

      // Deactivate old subscription if exists
      if (currentSubscription) {
        await supabase
          .from("user_subscriptions")
          .update({ is_active: false })
          .eq("id", currentSubscription.id);
      }

      // Create new subscription
      const { error } = await supabase
        .from("user_subscriptions")
        .insert({
          user_id: user.id,
          plan_id: plan.id,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          is_active: true,
        });

      if (error) throw error;

      toast.success("Plano gratuito ativado com sucesso!");
      loadPlansAndSubscription();
    } catch (error) {
      console.error("Error activating free plan:", error);
      toast.error("Erro ao ativar plano");
    }
  };

  const handlePaymentSuccess = async () => {
    setShowPaymentDialog(false);
    setSelectedPlan(null);
    toast.success("Pagamento realizado! Plano ativado.");
    loadPlansAndSubscription();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isCurrentPlan = (planId: string) => {
    return currentSubscription?.plan_id === planId;
  };

  const getButtonText = (plan: Plan) => {
    if (isCurrentPlan(plan.id)) return "Plano Atual";
    if (plan.price === 0) return "Ativar Plano Gratuito";
    return "Assinar Plano";
  };

  return (
    <div className="space-y-6">
      {currentSubscription && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Plano Atual
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-lg">
                  {currentSubscription.subscription_plans.name}
                </span>
                <Badge variant="default">Ativo</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {currentSubscription.subscription_plans.description}
              </p>
              <div className="text-sm space-y-1 mt-4">
                <p>
                  <strong>Válido até:</strong>{" "}
                  {new Date(currentSubscription.end_date).toLocaleDateString("pt-BR")}
                </p>
                {currentSubscription.subscription_plans.max_products && (
                  <p>
                    <strong>Produtos:</strong> até {currentSubscription.subscription_plans.max_products}
                  </p>
                )}
                {currentSubscription.subscription_plans.max_categories && (
                  <p>
                    <strong>Categorias:</strong> até {currentSubscription.subscription_plans.max_categories}
                  </p>
                )}
                {!currentSubscription.subscription_plans.max_products && (
                  <p>
                    <strong>Produtos e Categorias:</strong> Ilimitados
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => (
          <Card key={plan.id} className={isCurrentPlan(plan.id) ? "border-primary" : ""}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-3xl font-bold">
                  {plan.price === 0 ? (
                    "Grátis"
                  ) : (
                    <>
                      R$ {plan.price.toFixed(2)}
                      <span className="text-sm font-normal text-muted-foreground">/mês</span>
                    </>
                  )}
                </p>
              </div>
              <div className="space-y-2 text-sm">
                {plan.max_products ? (
                  <p>✓ Até {plan.max_products} produtos</p>
                ) : (
                  <p>✓ Produtos ilimitados</p>
                )}
                {plan.max_categories ? (
                  <p>✓ Até {plan.max_categories} categorias</p>
                ) : (
                  <p>✓ Categorias ilimitadas</p>
                )}
                <p>✓ QR Code personalizado</p>
                <p>✓ Integração WhatsApp</p>
                <p>✓ Gerenciamento de pedidos</p>
              </div>
              <Button
                variant={isCurrentPlan(plan.id) ? "outline" : "default"}
                className="w-full"
                onClick={() => handleSubscribe(plan)}
                disabled={isCurrentPlan(plan.id)}
              >
                {getButtonText(plan)}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {!currentSubscription && (
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground text-center">
              💡 Escolha um plano para começar a usar o sistema de cardápio digital.
              <br />
              Você pode mudar de plano a qualquer momento.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pagamento do Plano</DialogTitle>
          </DialogHeader>
          {selectedPlan && restaurantId && (
            <SubscriptionPaymentCheckout
              restaurantId={restaurantId}
              plan={selectedPlan as Tables<'subscription_plans'>}
              onPaymentSuccess={handlePaymentSuccess}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}