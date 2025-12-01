import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, Clock, Users, Phone, Mail, Plus, Pencil, X, Check } from "lucide-react";
import { format } from "date-fns";

interface Reservation {
  id: string;
  table_id: string | null;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  status: string;
  notes: string | null;
  confirmation_code: string;
  created_at: string;
}

interface Table {
  id: string;
  table_number: string;
  capacity: number;
}

export default function ReservationsManager() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [restaurantId, setRestaurantId] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [formData, setFormData] = useState({
    table_id: "",
    customer_name: "",
    customer_phone: "",
    customer_email: "",
    reservation_date: "",
    reservation_time: "",
    party_size: "",
    notes: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id")
        .eq("owner_id", user.id)
        .single();

      if (!restaurant) return;
      setRestaurantId(restaurant.id);

      // Carregar reservas
      const { data: reservationsData, error: reservationsError } = await supabase
        .from("reservations")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .order("reservation_date", { ascending: true })
        .order("reservation_time", { ascending: true });

      if (reservationsError) throw reservationsError;
      setReservations(reservationsData || []);

      // Carregar mesas
      const { data: tablesData, error: tablesError } = await supabase
        .from("tables")
        .select("id, table_number, capacity")
        .eq("restaurant_id", restaurant.id)
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

    if (!restaurantId) {
      toast.error("ID do restaurante não encontrado");
      return;
    }

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

      const { error } = await supabase
        .from("reservations")
        .insert([reservationData]);

      if (error) throw error;

      toast.success("Reserva criada com sucesso!");
      resetForm();
      setDialogOpen(false);
      loadData();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from("reservations")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;
      toast.success("Status atualizado!");
      loadData();
    } catch (error: any) {
      toast.error("Erro: " + error.message);
    }
  };

  const resetForm = () => {
    setFormData({
      table_id: "",
      customer_name: "",
      customer_phone: "",
      customer_email: "",
      reservation_date: "",
      reservation_time: "",
      party_size: "",
      notes: "",
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: "secondary", label: "Pendente" },
      confirmed: { variant: "default", label: "Confirmada" },
      cancelled: { variant: "destructive", label: "Cancelada" },
      completed: { variant: "outline", label: "Concluída" },
      no_show: { variant: "destructive", label: "Não Compareceu" },
    };
    const config = variants[status] || variants.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredReservations = filterStatus === "all" 
    ? reservations 
    : reservations.filter(r => r.status === filterStatus);

  if (loading) {
    return <div className="text-center py-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Reservas</h2>
          <p className="text-muted-foreground">Gerencie as reservas de mesas</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button disabled={!restaurantId}>
              <Plus className="mr-2 h-4 w-4" />
              Nova Reserva
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Nova Reserva</DialogTitle>
              <DialogDescription>
                Preencha os dados da reserva
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Nome do Cliente *</Label>
                  <Input
                    id="customer_name"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customer_phone">Telefone *</Label>
                  <Input
                    id="customer_phone"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_email">E-mail</Label>
                <Input
                  id="customer_email"
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="reservation_date">Data *</Label>
                  <Input
                    id="reservation_date"
                    type="date"
                    value={formData.reservation_date}
                    onChange={(e) => setFormData({ ...formData, reservation_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reservation_time">Horário *</Label>
                  <Input
                    id="reservation_time"
                    type="time"
                    value={formData.reservation_time}
                    onChange={(e) => setFormData({ ...formData, reservation_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="party_size">Número de Pessoas *</Label>
                  <Input
                    id="party_size"
                    type="number"
                    min="1"
                    value={formData.party_size}
                    onChange={(e) => setFormData({ ...formData, party_size: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="table_id">Mesa (opcional)</Label>
                  <Select value={formData.table_id} onValueChange={(value) => setFormData({ ...formData, table_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma mesa" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Sem mesa atribuída</SelectItem>
                      {tables.map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          Mesa {table.table_number} ({table.capacity} pessoas)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => {
                  setDialogOpen(false);
                  resetForm();
                }}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Reserva</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filtro */}
      <div className="flex gap-2">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="confirmed">Confirmadas</SelectItem>
            <SelectItem value="cancelled">Canceladas</SelectItem>
            <SelectItem value="completed">Concluídas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista de Reservas */}
      <div className="space-y-4">
        {filteredReservations.map((reservation) => (
          <Card key={reservation.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span>{reservation.customer_name}</span>
                    {getStatusBadge(reservation.status)}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Código: <span className="font-mono font-semibold">{reservation.confirmation_code}</span>
                  </CardDescription>
                </div>
                {reservation.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="default"
                      onClick={() => updateStatus(reservation.id, "confirmed")}
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Confirmar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => updateStatus(reservation.id, "cancelled")}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>{format(new Date(reservation.reservation_date + "T00:00:00"), "dd/MM/yyyy")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span>{reservation.reservation_time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span>{reservation.party_size} pessoas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span>{reservation.customer_phone}</span>
                </div>
              </div>
              {reservation.customer_email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span>{reservation.customer_email}</span>
                </div>
              )}
              {reservation.notes && (
                <div className="bg-muted/50 p-2 rounded text-sm mt-2">
                  <p className="text-muted-foreground">{reservation.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {filteredReservations.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Nenhuma reserva encontrada.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
