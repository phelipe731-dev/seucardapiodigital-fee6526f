import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Menu, Smartphone, QrCode, ShoppingCart, BarChart3, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center text-white">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 backdrop-blur-sm">
              <Zap className="h-4 w-4" />
              <span className="text-sm font-medium">Cardápio Digital Inteligente</span>
            </div>
            <h1 className="mb-6 text-4xl font-bold leading-tight md:text-6xl">
              Transforme Seu Restaurante com Cardápio Digital
            </h1>
            <p className="mb-8 text-lg text-white/90 md:text-xl max-w-2xl mx-auto">
              Sistema completo para criar, gerenciar e receber pedidos pelo WhatsApp. 
              Simples, rápido e profissional.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-semibold" asChild>
                <Link to="/auth">Criar Meu Cardápio Grátis</Link>
              </Button>
              <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10" asChild>
                <Link to="/auth">Ver Demo</Link>
              </Button>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-foreground">Tudo que Você Precisa</h2>
            <p className="text-muted-foreground text-lg">Funcionalidades pensadas para facilitar seu dia a dia</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 hover:shadow-elevated transition-shadow">
              <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-4">
                <Menu className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Cardápio Personalizado</h3>
              <p className="text-muted-foreground">
                Crie seu cardápio com categorias, fotos e descrições completas dos produtos.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-elevated transition-shadow">
              <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-4">
                <ShoppingCart className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Pedidos Diretos</h3>
              <p className="text-muted-foreground">
                Clientes fazem pedidos direto pelo cardápio. Comprovante enviado automaticamente pro WhatsApp.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-elevated transition-shadow">
              <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-4">
                <QrCode className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">QR Code Exclusivo</h3>
              <p className="text-muted-foreground">
                Cada restaurante tem seu QR Code. Cliente escaneia e vê o cardápio na hora.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-elevated transition-shadow">
              <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-4">
                <Smartphone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">100% Responsivo</h3>
              <p className="text-muted-foreground">
                Funciona perfeitamente em celulares, tablets e computadores.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-elevated transition-shadow">
              <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Painel de Controle</h3>
              <p className="text-muted-foreground">
                Gerencie tudo em um só lugar: produtos, preços, pedidos e configurações.
              </p>
            </Card>

            <Card className="p-6 hover:shadow-elevated transition-shadow">
              <div className="w-12 h-12 bg-primary-light rounded-lg flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-semibold mb-2 text-foreground">Super Rápido</h3>
              <p className="text-muted-foreground">
                Configure em minutos. Sem complicação, sem instalação, sem mensalidade.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-muted">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-4 text-foreground">
            Pronto para Modernizar Seu Restaurante?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Junte-se a centenas de restaurantes que já usam nosso sistema
          </p>
          <Button size="lg" className="font-semibold" asChild>
            <Link to="/auth">Começar Agora - É Grátis</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-border">
        <div className="container mx-auto max-w-6xl text-center text-muted-foreground">
          <p>© 2024 Cardápio Digital. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
