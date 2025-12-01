import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Gift, TrendingUp, Award, Phone, Crown, Medal, Trophy, Sparkles } from "lucide-react";

interface LoyaltyCustomer {
  points: number;
  total_spent: number;
  visit_count: number;
  tier: string;
}

interface LoyaltyReward {
  id: string;
  name: string;
  description: string | null;
  points_required: number;
  reward_type: string;
  reward_value: number | null;
}

export default function CustomerLoyalty() {
  const { restaurantId } = useParams();
  const [loading, setLoading] = useState(true);
  const [customer, setCustomer] = useState<LoyaltyCustomer | null>(null);
  const [rewards, setRewards] = useState<LoyaltyReward[]>([]);
  const [phone, setPhone] = useState("");
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    loadRewards();
  }, [restaurantId]);

  const loadRewards = async () => {
    try {
      const { data, error } = await supabase
        .from("loyalty_rewards")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("points_required", { ascending: true });

      if (error) throw error;
      setRewards(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar recompensas");
    } finally {
      setLoading(false);
    }
  };

  const searchCustomer = async () => {
    if (!phone.trim()) {
      toast.error("Digite seu número de telefone");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("loyalty_customers")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .eq("customer_phone", phone)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      
      setCustomer(data);
      setSearched(true);

      if (!data) {
        toast.info("Você ainda não tem pontos. Faça seu primeiro pedido!");
      }
    } catch (error: any) {
      toast.error("Erro ao buscar dados");
    } finally {
      setLoading(false);
    }
  };

  const redeemReward = async (reward: LoyaltyReward) => {
    if (!customer || customer.points < reward.points_required) {
      toast.error("Pontos insuficientes");
      return;
    }

    if (!confirm(`Deseja resgatar "${reward.name}" por ${reward.points_required} pontos?`)) {
      return;
    }

    try {
      // Criar resgate
      const { error: redemptionError } = await supabase
        .from("loyalty_redemptions")
        .insert([{
          restaurant_id: restaurantId,
          customer_phone: phone,
          reward_id: reward.id,
          points_spent: reward.points_required,
          status: "completed"
        }]);

      if (redemptionError) throw redemptionError;

      // Atualizar pontos do cliente
      const { error: updateError } = await supabase
        .from("loyalty_customers")
        .update({ points: customer.points - reward.points_required })
        .eq("restaurant_id", restaurantId)
        .eq("customer_phone", phone);

      if (updateError) throw updateError;

      toast.success("Recompensa resgatada com sucesso! Entre em contato com o restaurante.");
      searchCustomer(); // Recarregar dados
    } catch (error: any) {
      toast.error("Erro ao resgatar recompensa: " + error.message);
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case "ouro": return <Crown className="h-8 w-8 text-yellow-500" />;
      case "prata": return <Medal className="h-8 w-8 text-gray-400" />;
      default: return <Trophy className="h-8 w-8 text-amber-700" />;
    }
  };

  const getTierLabel = (tier: string) => {
    const labels = { bronze: "Bronze", prata: "Prata", ouro: "Ouro" };
    return labels[tier as keyof typeof labels] || tier;
  };

  const getNextTier = () => {
    if (!customer) return null;
    if (customer.tier === "ouro") return null;
    if (customer.tier === "prata") return { name: "Ouro", points: 1000 };
    return { name: "Prata", points: 500 };
  };

  const getTierProgress = () => {
    if (!customer) return 0;
    const nextTier = getNextTier();
    if (!nextTier) return 100;
    return (customer.points / nextTier.points) * 100;
  };

  if (loading && !searched) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Sparkles className="h-16 w-16 text-primary" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            Programa de Fidelidade
          </h1>
          <p className="text-muted-foreground">Acumule pontos e ganhe recompensas incríveis!</p>
        </div>

        {!searched ? (
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle>Consultar Pontos</CardTitle>
              <CardDescription>Digite seu telefone para ver seus pontos</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <div className="flex gap-2">
                  <Phone className="h-5 w-5 text-muted-foreground mt-2" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(00) 00000-0000"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && searchCustomer()}
                  />
                </div>
              </div>
              <Button onClick={searchCustomer} className="w-full" disabled={loading}>
                {loading ? "Buscando..." : "Consultar"}
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {customer && (
              <Card className="relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/10 to-transparent rounded-full -mr-32 -mt-32" />
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Meus Pontos</span>
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      {getTierIcon(customer.tier)}
                      <span className="ml-2">{getTierLabel(customer.tier)}</span>
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center space-y-2">
                    <div className="text-6xl font-bold text-primary">{customer.points}</div>
                    <p className="text-muted-foreground">pontos disponíveis</p>
                  </div>

                  {getNextTier() && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Próximo nível: {getNextTier()?.name}</span>
                        <span>{customer.points} / {getNextTier()?.points}</span>
                      </div>
                      <Progress value={getTierProgress()} />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                    <div className="text-center">
                      <div className="text-2xl font-bold">R$ {customer.total_spent.toFixed(2)}</div>
                      <p className="text-sm text-muted-foreground">Total gasto</p>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold">{customer.visit_count}</div>
                      <p className="text-sm text-muted-foreground">Pedidos</p>
                    </div>
                  </div>

                  <Button variant="outline" onClick={() => setSearched(false)} className="w-full">
                    Trocar Telefone
                  </Button>
                </CardContent>
              </Card>
            )}

            <div className="space-y-4">
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Gift className="h-6 w-6" />
                Recompensas Disponíveis
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                {rewards.map((reward) => {
                  const canRedeem = customer && customer.points >= reward.points_required;
                  return (
                    <Card key={reward.id} className={canRedeem ? "border-primary" : ""}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{reward.name}</span>
                          <Badge variant={canRedeem ? "default" : "secondary"}>
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {reward.points_required} pts
                          </Badge>
                        </CardTitle>
                        <CardDescription>{reward.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {reward.reward_value && (
                          <p className="text-lg font-bold mb-4">
                            R$ {reward.reward_value.toFixed(2)}
                          </p>
                        )}
                        <Button
                          onClick={() => redeemReward(reward)}
                          disabled={!canRedeem}
                          className="w-full"
                          variant={canRedeem ? "default" : "outline"}
                        >
                          {canRedeem ? "Resgatar Agora" : "Pontos Insuficientes"}
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {rewards.length === 0 && (
                <Card>
                  <CardContent className="text-center py-12">
                    <Gift className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">Nenhuma recompensa disponível no momento.</p>
                  </CardContent>
                </Card>
              )}
            </div>

            <Card className="bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5" />
                  Como Funciona?
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <p>✨ Ganhe 1 ponto a cada R$ 10 gastos</p>
                <p>🥉 Bronze: 0-499 pontos</p>
                <p>🥈 Prata: 500-999 pontos</p>
                <p>🥇 Ouro: 1000+ pontos</p>
                <p>🎁 Resgate pontos por recompensas incríveis!</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}