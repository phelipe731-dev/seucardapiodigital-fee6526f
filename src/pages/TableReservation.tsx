import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Calendar, Clock, Users, ArrowLeft, CheckCircle2 } from "lucide-react";

interface Restaurant {
  id: string;
  name: string;
  logo_url: string | null;
  phone: string;
  address: string | null;
}

interface Table {
  id: string;
  table_number: string;
  capacity: number;
  location: string | null;
}

export default function TableReservation() {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");

  const [formData, setFormData] = useState({
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    reservation_date: "",
    reservation_time: "",
    party_size: "",
    table_id: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, [restaurantId]);

  const loadData = async () => {
    try {
      if (!restaurantId) return;

      // Carregar dados do restaurante
      const { data: restaurantData, error: restaurantError } = await supabase
        .from("restaurants")
        .select("id, name, logo_url, phone, address")
        .eq("id", restaurantId)
        .single();

      if (restaurantError) throw restaurantError;
      setRestaurant(restaurantData);

      // Carregar mesas disponíveis
      const { data: tablesData, error: tablesError } = await supabase
        .from("tables")
        .select("id, table_number, capacity, location")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("table_number");

      if (tablesError) throw tablesError;
      setTables(tablesData || []);
    } catch (error: any) {
      toast.error("Erro ao carregar dados: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const reservationData = {
        restaurant_id: restaurantId,
        table_id: formData.table_id || null,
        customer_name: formData.customer_name.trim(),
        customer_phone: formData.customer_phone.trim(),
        customer_email: formData.customer_email.trim() || null,
        reservation_date: formData.reservation_date,
        reservation_time: formData.reservation_time,
        party_size: parseInt(formData.party_size),
        notes: formData.notes.trim() || null,
        status: "pending",
      };

      const { data, error } = await supabase
        .from("reservations")
        .insert([reservationData])
        .select()
        .single();

      if (error) throw error;

      setConfirmationCode(data.confirmation_code || "");
      setSuccess(true);
      toast.success("Reserva solicitada com sucesso!");

      // Enviar notificação WhatsApp (não bloqueia o fluxo se falhar)
      try {
        await supabase.functions.invoke('send-reservation-notification', {
          body: {
            reservationId: data.id,
            restaurantId: restaurantId
          }
        });
      } catch (notificationError) {
        console.error('Failed to send notification:', notificationError);
      }
    } catch (error: any) {
      toast.error("Erro ao criar reserva: " + error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">Restaurante não encontrado</p>
            <Button className="mt-4" onClick={() => navigate("/")}>
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Reserva Solicitada!</CardTitle>
            <CardDescription className="text-base">
              Sua reserva foi enviada com sucesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground mb-1">Código de Confirmação</p>
              <p className="text-2xl font-bold font-mono text-primary">{confirmationCode}</p>
            </div>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>✓ Reserva registrada no sistema</p>
              <p>✓ Aguarde a confirmação do restaurante</p>
              <p>✓ Guarde o código de confirmação</p>
            </div>
            <div className="pt-4 space-y-2">
              <Button className="w-full" onClick={() => navigate(`/menu/${restaurantId}`)}>
                Ver Cardápio
              </Button>
              <Button variant="outline" className="w-full" onClick={() => window.location.reload()}>
                Fazer Outra Reserva
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/menu/${restaurantId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              {restaurant.logo_url && (
                <img
                  src={restaurant.logo_url}
                  alt={restaurant.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              )}
              <div>
                <h1 className="font-bold text-lg">{restaurant.name}</h1>
                <p className="text-sm text-muted-foreground">Reserva de Mesa</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Formulário */}
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Solicitar Reserva</CardTitle>
            <CardDescription>
              Preencha os dados abaixo para reservar uma mesa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados Pessoais */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Seus Dados</h3>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customer_name">Nome Completo *</Label>
                    <Input
                      id="customer_name"
                      value={formData.customer_name}
                      onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                      placeholder="Digite seu nome"
                      required
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="customer_phone">Telefone/WhatsApp *</Label>
                      <Input
                        id="customer_phone"
                        value={formData.customer_phone}
                        onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                        placeholder="(11) 99999-9999"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customer_email">E-mail (opcional)</Label>
                      <Input
                        id="customer_email"
                        type="email"
                        value={formData.customer_email}
                        onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Detalhes da Reserva */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Detalhes da Reserva</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reservation_date" className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      Data *
                    </Label>
                    <Input
                      id="reservation_date"
                      type="date"
                      min={getMinDate()}
                      value={formData.reservation_date}
                      onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reservation_time" className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Horário *
                    </Label>
                    <Input
                      id="reservation_time"
                      type="time"
                      value={formData.reservation_time}
                      onChange={(e) => setFormData({ ...formData, reservation_time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="party_size" className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Número de Pessoas *
                    </Label>
                    <Input
                      id="party_size"
                      type="number"
                      min="1"
                      max="20"
                      value={formData.party_size}
                      onChange={(e) => setFormData({ ...formData, party_size: e.target.value })}
                      placeholder="Ex: 4"
                      required
                    />
                  </div>
                  {tables.length > 0 && (
                    <div className="space-y-2">
                      <Label htmlFor="table_id">Mesa (opcional)</Label>
                      <Select value={formData.table_id} onValueChange={(value) => setFormData({ ...formData, table_id: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Escolha uma mesa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sem preferência</SelectItem>
                          {tables.map((table) => (
                            <SelectItem key={table.id} value={table.id}>
                              Mesa {table.table_number} - {table.capacity} pessoas
                              {table.location && ` (${table.location})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Observações */}
              <div className="space-y-2">
                <Label htmlFor="notes">Observações (opcional)</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Ex: Aniversário, cadeira infantil, alergias..."
                  rows={3}
                />
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => navigate(`/menu/${restaurantId}`)}
                  disabled={submitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting}
                >
                  {submitting ? "Enviando..." : "Confirmar Reserva"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
