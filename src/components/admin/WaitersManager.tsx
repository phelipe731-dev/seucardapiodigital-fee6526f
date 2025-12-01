import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { UserPlus, Trash2, Mail, Lock, User, Loader2, Trophy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WaiterRankings from "./WaiterRankings";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Waiter {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
  full_name?: string;
}

export default function WaitersManager() {
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const [newWaiter, setNewWaiter] = useState({
    email: "",
    password: "",
    full_name: "",
  });

  useEffect(() => {
    loadWaiters();
  }, []);

  const loadWaiters = async () => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select(`
          id,
          user_id,
          role,
          created_at
        `)
        .eq("role", "waiter");

      if (error) throw error;

      // Get user emails from profiles
      if (data) {
        const userIds = data.map(w => w.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        const waitersWithProfiles = data.map(waiter => {
          const profile = profiles?.find(p => p.id === waiter.user_id);
          return {
            ...waiter,
            full_name: profile?.full_name,
          };
        });

        setWaiters(waitersWithProfiles);
      }
    } catch (error: any) {
      toast.error("Erro ao carregar garçons: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWaiter = async () => {
    if (!newWaiter.email || !newWaiter.password) {
      toast.error("Preencha email e senha");
      return;
    }

    setCreating(true);
    try {
      // Sign up the new waiter
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: newWaiter.email,
        password: newWaiter.password,
        options: {
          data: {
            full_name: newWaiter.full_name,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!signUpData.user) throw new Error("Erro ao criar usuário");

      // Add waiter role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: signUpData.user.id,
          role: "waiter",
        });

      if (roleError) throw roleError;

      toast.success("Garçom criado com sucesso!");
      setShowDialog(false);
      setNewWaiter({ email: "", password: "", full_name: "" });
      loadWaiters();
    } catch (error: any) {
      toast.error("Erro ao criar garçom: " + error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteWaiter = async (userId: string) => {
    try {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", "waiter");

      if (error) throw error;

      toast.success("Acesso de garçom removido");
      setDeleteConfirm(null);
      loadWaiters();
    } catch (error: any) {
      toast.error("Erro ao remover garçom: " + error.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="list" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="list" className="gap-2">
            <User className="h-4 w-4" />
            Lista de Garçons
          </TabsTrigger>
          <TabsTrigger value="rankings" className="gap-2">
            <Trophy className="h-4 w-4" />
            Rankings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Gerenciar Garçons</h2>
              <p className="text-muted-foreground">
                Adicione e remova acesso de garçons ao sistema
              </p>
            </div>
        
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="h-4 w-4" />
              Novo Garçom
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adicionar Novo Garçom</DialogTitle>
              <DialogDescription>
                Crie uma conta de garçom com email e senha
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo</Label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="Nome do garçom"
                    value={newWaiter.full_name}
                    onChange={(e) => setNewWaiter({ ...newWaiter, full_name: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="garcom@exemplo.com"
                    value={newWaiter.email}
                    onChange={(e) => setNewWaiter({ ...newWaiter, email: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={newWaiter.password}
                    onChange={(e) => setNewWaiter({ ...newWaiter, password: e.target.value })}
                    className="pl-9"
                  />
                </div>
              </div>
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDialog(false)}
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button onClick={handleCreateWaiter} disabled={creating}>
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  "Criar Garçom"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {waiters.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <User className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <h3 className="mt-4 text-lg font-semibold">Nenhum garçom cadastrado</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Adicione garçons para que possam gerenciar comandas
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {waiters.map((waiter) => (
            <Card key={waiter.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {waiter.full_name || "Garçom"}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      ID: {waiter.user_id.slice(0, 8)}...
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    Garçom
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-xs text-muted-foreground">
                    Cadastrado em: {new Date(waiter.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  
                  <Button
                    variant="destructive"
                    size="sm"
                    className="w-full gap-2"
                    onClick={() => setDeleteConfirm(waiter.user_id)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Remover Acesso
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Acesso de Garçom?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação irá remover a permissão de garçom deste usuário. 
              Ele não poderá mais acessar o painel de comandas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm && handleDeleteWaiter(deleteConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
        </TabsContent>

        <TabsContent value="rankings">
          <WaiterRankings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
