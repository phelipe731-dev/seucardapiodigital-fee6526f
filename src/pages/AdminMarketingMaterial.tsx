import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Download } from "lucide-react";
import { toast } from "sonner";
import materialsData from "@/data/materials.json";

export default function AdminMarketingMaterial() {
  const navigate = useNavigate();
  const { id } = useParams();

  useEffect(() => {
    const isAuth = localStorage.getItem("marketing_auth");
    if (!isAuth) {
      navigate("/marketing/login");
    }
  }, [navigate]);

  const material = materialsData.find((m) => m.id === Number(id));

  if (!material) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-muted-foreground mb-4">Material não encontrado</p>
          <Button onClick={() => navigate("/marketing")}>
            Voltar ao Painel
          </Button>
        </div>
      </div>
    );
  }

  const handleCopyLegenda = () => {
    navigator.clipboard.writeText(material.legenda);
    toast.success("Legenda copiada!");
  };

  const handleDownload = () => {
    toast.success("Download iniciado!");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-primary text-white shadow-elevated">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => navigate("/marketing")}
            >
              <ArrowLeft size={18} />
            </Button>
            <h1 className="text-2xl font-bold">{material.titulo}</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="aspect-square bg-muted rounded-lg overflow-hidden shadow-elevated">
              {material.tipo === "imagem" ? (
                <img
                  src={`https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=800&h=800&fit=crop`}
                  alt={material.titulo}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-primary text-white">
                  <p className="text-lg">Player de Vídeo</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold mb-2">{material.titulo}</h2>
              <Badge variant="secondary" className="mb-4">{material.categoria}</Badge>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {material.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Legenda Sugerida</h3>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{material.legenda}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                size="lg"
                className="w-full gap-2"
                onClick={handleCopyLegenda}
              >
                <Copy size={20} />
                Copiar Legenda
              </Button>
              <Button
                variant="gradient"
                size="lg"
                className="w-full gap-2"
                onClick={handleDownload}
              >
                <Download size={20} />
                Baixar Material
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
