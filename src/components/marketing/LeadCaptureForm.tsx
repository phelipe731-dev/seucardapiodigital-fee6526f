import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface LeadCaptureFormProps {
  open: boolean;
  onClose: () => void;
  material: any;
}

export function LeadCaptureForm({ open, onClose, material }: LeadCaptureFormProps) {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Salvar lead (aqui seria uma chamada à API)
    const lead = {
      nome,
      email,
      telefone,
      material_id: material?.id,
      data: new Date().toISOString()
    };

    console.log("Lead capturado:", lead);
    
    toast.success("Download iniciado! Obrigado pelo interesse.");
    onClose();
    
    // Resetar form
    setNome("");
    setEmail("");
    setTelefone("");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Baixar Material</DialogTitle>
          <DialogDescription>
            Preencha seus dados para fazer o download gratuito
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome Completo</Label>
            <Input
              id="nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Seu nome"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="telefone">Telefone (WhatsApp)</Label>
            <Input
              id="telefone"
              type="tel"
              value={telefone}
              onChange={(e) => setTelefone(e.target.value)}
              placeholder="(00) 00000-0000"
              required
            />
          </div>

          <Button type="submit" className="w-full" variant="gradient">
            Baixar Material
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
