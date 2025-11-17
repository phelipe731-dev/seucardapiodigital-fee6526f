import { MaterialCard } from "./MaterialCard";

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

interface MaterialGridProps {
  materials: Material[];
}

export function MaterialGrid({ materials }: MaterialGridProps) {
  if (materials.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">Nenhum material encontrado</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {materials.map((material) => (
        <MaterialCard key={material.id} material={material} />
      ))}
    </div>
  );
}
