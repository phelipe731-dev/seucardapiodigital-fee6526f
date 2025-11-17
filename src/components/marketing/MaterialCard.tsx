import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Download, Eye, Play } from "lucide-react";
import { toast } from "sonner";
import { MaterialPreview } from "./MaterialPreview";

interface Material {
  id: number;
  tipo: string;
  titulo: string;
  categoria: string;
  tags: string[];
  image?: string;
  thumb?: string;
  video?: string;
  legenda: string;
  destaque?: boolean;
}

interface MaterialCardProps {
  material: Material;
}

export function MaterialCard({ material }: MaterialCardProps) {
  const [showPreview, setShowPreview] = useState(false);

  const handleCopyLegenda = () => {
    navigator.clipboard.writeText(material.legenda);
    toast.success("Legenda copiada!");
  };

  const handleDownload = () => {
    toast.success("Download iniciado!");
  };

  return (
    <>
      <Card className="overflow-hidden hover:shadow-elevated transition-all group">
        <div className="relative aspect-square bg-muted overflow-hidden">
          {material.tipo === "imagem" ? (
            <img
              src={`https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=500&h=500&fit=crop`}
              alt={material.titulo}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-primary">
              <Play className="w-16 h-16 text-white" />
            </div>
          )}
          {material.destaque && (
            <Badge className="absolute top-2 right-2 bg-primary text-primary-foreground">
              Destaque
            </Badge>
          )}
          <Button
            variant="secondary"
            size="icon"
            className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => setShowPreview(true)}
          >
            <Eye size={18} />
          </Button>
        </div>
        <CardContent className="p-4">
          <h3 className="font-semibold text-lg mb-1 line-clamp-2">{material.titulo}</h3>
          <p className="text-sm text-muted-foreground mb-2">{material.categoria}</p>
          <div className="flex flex-wrap gap-1">
            {material.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        </CardContent>
        <CardFooter className="p-4 pt-0 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 gap-2"
            onClick={handleCopyLegenda}
          >
            <Copy size={16} />
            Copiar
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-2"
            onClick={handleDownload}
          >
            <Download size={16} />
            Baixar
          </Button>
        </CardFooter>
      </Card>

      <MaterialPreview
        material={material}
        open={showPreview}
        onClose={() => setShowPreview(false)}
      />
    </>
  );
}
