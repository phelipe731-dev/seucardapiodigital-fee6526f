import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Upload, Image, Video } from "lucide-react";
import { toast } from "sonner";

export default function AdminMarketingUploads() {
  const navigate = useNavigate();
  const [tipo, setTipo] = useState<"imagem" | "video">("imagem");
  const [titulo, setTitulo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tags, setTags] = useState("");
  const [legenda, setLegenda] = useState("");

  useEffect(() => {
    const isAuth = localStorage.getItem("marketing_auth");
    if (!isAuth) {
      navigate("/marketing/login");
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Material publicado com sucesso!");
    navigate("/marketing");
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
            <h1 className="text-2xl font-bold">Upload de Material</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <Card className="shadow-elevated">
          <CardHeader>
            <CardTitle>Novo Material de Marketing</CardTitle>
            <CardDescription>
              Adicione imagens ou vídeos para sua biblioteca de materiais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label>Tipo de Material</Label>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    type="button"
                    variant={tipo === "imagem" ? "default" : "outline"}
                    className="h-24 flex flex-col gap-2"
                    onClick={() => setTipo("imagem")}
                  >
                    <Image size={32} />
                    <span>Imagem</span>
                  </Button>
                  <Button
                    type="button"
                    variant={tipo === "video" ? "default" : "outline"}
                    className="h-24 flex flex-col gap-2"
                    onClick={() => setTipo("video")}
                  >
                    <Video size={32} />
                    <span>Vídeo</span>
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="file">Arquivo</Label>
                <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                  <Upload className="mx-auto mb-4 text-muted-foreground" size={48} />
                  <p className="text-sm text-muted-foreground mb-2">
                    Clique para selecionar ou arraste o arquivo aqui
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tipo === "imagem" ? "JPG, PNG, WEBP até 10MB" : "MP4, MOV até 100MB"}
                  </p>
                  <Input
                    id="file"
                    type="file"
                    className="hidden"
                    accept={tipo === "imagem" ? "image/*" : "video/*"}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="titulo">Título do Material</Label>
                <Input
                  id="titulo"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ex: Promoção Black Friday 2024"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoria</Label>
                <Select value={categoria} onValueChange={setCategoria}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Instagram Feed">Instagram Feed</SelectItem>
                    <SelectItem value="Instagram Stories">Instagram Stories</SelectItem>
                    <SelectItem value="Vídeos Reels (9:16)">Vídeos Reels (9:16)</SelectItem>
                    <SelectItem value="Vídeos TikTok (9:16)">Vídeos TikTok (9:16)</SelectItem>
                    <SelectItem value="Vídeos Quadrados (1:1)">Vídeos Quadrados (1:1)</SelectItem>
                    <SelectItem value="Vídeos Institucionais (16:9)">Vídeos Institucionais (16:9)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tags">Tags</Label>
                <Input
                  id="tags"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="Separe as tags por vírgula: promo, sms, blackfriday"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="legenda">Legenda Sugerida</Label>
                <Textarea
                  id="legenda"
                  value={legenda}
                  onChange={(e) => setLegenda(e.target.value)}
                  placeholder="Escreva uma legenda sugerida para este material..."
                  rows={4}
                />
              </div>

              <Button type="submit" className="w-full" variant="gradient" size="lg">
                Publicar Material
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
