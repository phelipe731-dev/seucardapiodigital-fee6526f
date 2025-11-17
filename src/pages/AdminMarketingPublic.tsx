import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft } from "lucide-react";
import { MaterialGrid } from "@/components/marketing/MaterialGrid";
import { LeadCaptureForm } from "@/components/marketing/LeadCaptureForm";
import materialsData from "@/data/materials.json";

export default function AdminMarketingPublic() {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);

  const publicMaterials = materialsData.filter((m) => m.destaque);

  const filteredMaterials = publicMaterials.filter((item) => {
    return item.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
           item.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const handleDownloadRequest = (material: any) => {
    setSelectedMaterial(material);
    setShowLeadForm(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-gradient-primary text-white shadow-elevated">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="secondary"
              size="icon"
              onClick={() => navigate("/")}
            >
              <ArrowLeft size={18} />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Materiais de Marketing Uptech</h1>
              <p className="text-sm opacity-90">Baixe gratuitamente nossos materiais promocionais</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Input
            type="search"
            placeholder="Buscar materiais..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
        </div>

        <MaterialGrid materials={filteredMaterials} />

        {filteredMaterials.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg">Nenhum material encontrado</p>
          </div>
        )}
      </main>

      <LeadCaptureForm
        open={showLeadForm}
        onClose={() => setShowLeadForm(false)}
        material={selectedMaterial}
      />
    </div>
  );
}
