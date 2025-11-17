import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Upload, Globe, Image, Video, FileText } from "lucide-react";
import { MaterialGrid } from "@/components/marketing/MaterialGrid";
import { LegendasList } from "@/components/marketing/LegendasList";
import materialsData from "@/data/materials.json";
import legendasData from "@/data/legendas.json";

export default function AdminMarketing() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    const isAuth = localStorage.getItem("marketing_auth");
    if (!isAuth) {
      navigate("/marketing/login");
    }
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("marketing_auth");
    navigate("/marketing/login");
  };

  const images = materialsData.filter((m) => m.tipo === "imagem");
  const videos = materialsData.filter((m) => m.tipo === "video");

  const filteredImages = images.filter((item) => {
    const matchesSearch = item.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || item.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const filteredVideos = videos.filter((item) => {
    const matchesSearch = item.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "all" || item.categoria === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const imageCategories = ["all", ...Array.from(new Set(images.map(i => i.categoria)))];
  const videoCategories = ["all", ...Array.from(new Set(videos.map(v => v.categoria)))];

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-primary text-white shadow-elevated sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Central de Marketing Uptech</h1>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                onClick={() => navigate("/marketing/uploads")}
                className="gap-2"
              >
                <Upload size={18} />
                Upload
              </Button>
              <Button
                variant="secondary"
                onClick={() => navigate("/marketing/public")}
                className="gap-2"
              >
                <Globe size={18} />
                Público
              </Button>
              <Button
                variant="secondary"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut size={18} />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Input
            type="search"
            placeholder="Buscar por nome ou tag..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <Tabs defaultValue="images" className="space-y-8">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="images" className="gap-2">
              <Image size={18} />
              Imagens ({images.length})
            </TabsTrigger>
            <TabsTrigger value="videos" className="gap-2">
              <Video size={18} />
              Vídeos ({videos.length})
            </TabsTrigger>
            <TabsTrigger value="legendas" className="gap-2">
              <FileText size={18} />
              Legendas ({legendasData.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="images">
            <div className="mb-4 flex gap-2 flex-wrap">
              {imageCategories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === "all" ? "Todas" : cat}
                </Button>
              ))}
            </div>
            <MaterialGrid materials={filteredImages} />
          </TabsContent>

          <TabsContent value="videos">
            <div className="mb-4 flex gap-2 flex-wrap">
              {videoCategories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === "all" ? "Todas" : cat}
                </Button>
              ))}
            </div>
            <MaterialGrid materials={filteredVideos} />
          </TabsContent>

          <TabsContent value="legendas">
            <LegendasList legendas={legendasData} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
