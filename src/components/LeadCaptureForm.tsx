import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export const LeadCaptureForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
  });
  const { toast } = useToast();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Aqui você pode adicionar integração com backend
    toast({
      title: "Cadastro realizado!",
      description: "Em breve entraremos em contato com você.",
    });
    
    setFormData({ name: "", email: "", phone: "" });
  };

  return (
    <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
      <h3 className="text-2xl font-bold text-foreground mb-2">
        Teste grátis e automatize seu atendimento hoje
      </h3>
      <p className="text-muted-foreground mb-6 text-sm">
        Não é necessário incluir dados do cartão de crédito
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Input
            type="text"
            placeholder="Seu nome *"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
            className="bg-background"
          />
        </div>

        <div>
          <Input
            type="email"
            placeholder="Seu melhor e-mail *"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="bg-background"
          />
        </div>

        <div>
          <Input
            type="tel"
            placeholder="Seu WhatsApp *"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
            className="bg-background"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full bg-secondary hover:bg-secondary/90 text-white font-bold text-lg py-6"
        >
          Testar grátis por 7 dias
        </Button>

        <p className="text-xs text-muted-foreground text-center">
          *válido somente para novas contratações
        </p>
      </form>
    </div>
  );
};
