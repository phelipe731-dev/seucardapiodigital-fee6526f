import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { toast } from "sonner";

interface Legenda {
  id: number;
  categoria: string;
  texto: string;
}

interface LegendasListProps {
  legendas: Legenda[];
}

export function LegendasList({ legendas }: LegendasListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("all");

  const categorias = ["all", ...Array.from(new Set(legendas.map(l => l.categoria)))];

  const filteredLegendas = legendas.filter((legenda) => {
    const matchesSearch = legenda.texto.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategoria = selectedCategoria === "all" || legenda.categoria === selectedCategoria;
    return matchesSearch && matchesCategoria;
  });

  const handleCopy = (texto: string) => {
    navigator.clipboard.writeText(texto);
    toast.success("Legenda copiada!");
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Input
          type="search"
          placeholder="Buscar legenda..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
        
        <div className="flex gap-2 flex-wrap">
          {categorias.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategoria === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategoria(cat)}
            >
              {cat === "all" ? "Todas" : cat}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredLegendas.map((legenda) => (
          <Card key={legenda.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  <Badge variant="secondary">{legenda.categoria}</Badge>
                  <p className="text-sm leading-relaxed">{legenda.texto}</p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopy(legenda.texto)}
                >
                  <Copy size={18} />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLegendas.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-lg">Nenhuma legenda encontrada</p>
        </div>
      )}
    </div>
  );
}
