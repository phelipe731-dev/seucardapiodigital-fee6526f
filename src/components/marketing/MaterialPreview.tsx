import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Download } from "lucide-react";
import { toast } from "sonner";

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

interface MaterialPreviewProps {
  material: Material;
  open: boolean;
  onClose: () => void;
}

export function MaterialPreview({ material, open, onClose }: MaterialPreviewProps) {
  const handleCopyLegenda = () => {
    navigator.clipboard.writeText(material.legenda);
    toast.success("Legenda copiada!");
  };

  const handleDownload = () => {
    toast.success("Download iniciado!");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{material.titulo}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="aspect-video bg-muted rounded-lg overflow-hidden">
            {material.tipo === "imagem" ? (
              <img
                src={`https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=1200&h=800&fit=crop`}
                alt={material.titulo}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-primary text-white">
                <p className="text-lg">Player de Vídeo</p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Categoria</p>
              <Badge variant="secondary">{material.categoria}</Badge>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Tags</p>
              <div className="flex flex-wrap gap-2">
                {material.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm text-muted-foreground mb-2">Legenda Sugerida</p>
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{material.legenda}</p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={handleCopyLegenda}
              >
                <Copy size={18} />
                Copiar Legenda
              </Button>
              <Button
                variant="default"
                className="flex-1 gap-2"
                onClick={handleDownload}
              >
                <Download size={18} />
                Baixar Material
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
