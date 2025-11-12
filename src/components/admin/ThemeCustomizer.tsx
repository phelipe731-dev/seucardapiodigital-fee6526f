import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Palette } from "lucide-react";
import { toast } from "sonner";

export default function ThemeCustomizer() {
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [colors, setColors] = useState({
    primary: "#DC2626",
    secondary: "#EA580C",
  });

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: restaurant } = await supabase
        .from("restaurants")
        .select("id, theme_primary_color, theme_secondary_color")
        .eq("owner_id", user.id)
        .single();

      if (restaurant) {
        setRestaurantId(restaurant.id);
        setColors({
          primary: restaurant.theme_primary_color || "#DC2626",
          secondary: restaurant.theme_secondary_color || "#EA580C",
        });
      }
    } catch (error) {
      console.error("Error loading theme:", error);
    }
  };

  const handleSave = async () => {
    if (!restaurantId) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from("restaurants")
        .update({
          theme_primary_color: colors.primary,
          theme_secondary_color: colors.secondary,
        })
        .eq("id", restaurantId);

      if (error) throw error;

      toast.success("Cores personalizadas salvas com sucesso!");
    } catch (error) {
      console.error("Error saving theme:", error);
      toast.error("Erro ao salvar personalização");
    } finally {
      setLoading(false);
    }
  };

  const presetColors = [
    { name: "Vermelho", primary: "#DC2626", secondary: "#EA580C" },
    { name: "Azul", primary: "#2563EB", secondary: "#0EA5E9" },
    { name: "Verde", primary: "#16A34A", secondary: "#22C55E" },
    { name: "Roxo", primary: "#9333EA", secondary: "#A855F7" },
    { name: "Rosa", primary: "#DB2777", secondary: "#EC4899" },
    { name: "Laranja", primary: "#EA580C", secondary: "#F97316" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Palette className="h-5 w-5" />
          Personalizar Cores do Cardápio
        </CardTitle>
        <CardDescription>
          Escolha as cores que representam sua marca
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="primary">Cor Principal</Label>
            <div className="flex gap-2">
              <Input
                id="primary"
                type="color"
                value={colors.primary}
                onChange={(e) =>
                  setColors({ ...colors, primary: e.target.value })
                }
                className="h-12 w-24 cursor-pointer"
              />
              <Input
                type="text"
                value={colors.primary}
                onChange={(e) =>
                  setColors({ ...colors, primary: e.target.value })
                }
                placeholder="#DC2626"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="secondary">Cor Secundária</Label>
            <div className="flex gap-2">
              <Input
                id="secondary"
                type="color"
                value={colors.secondary}
                onChange={(e) =>
                  setColors({ ...colors, secondary: e.target.value })
                }
                className="h-12 w-24 cursor-pointer"
              />
              <Input
                type="text"
                value={colors.secondary}
                onChange={(e) =>
                  setColors({ ...colors, secondary: e.target.value })
                }
                placeholder="#EA580C"
              />
            </div>
          </div>
        </div>

        <div>
          <Label className="mb-3 block">Paletas Pré-definidas</Label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {presetColors.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                onClick={() =>
                  setColors({
                    primary: preset.primary,
                    secondary: preset.secondary,
                  })
                }
                className="h-auto py-3"
              >
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div
                      className="h-6 w-6 rounded"
                      style={{ backgroundColor: preset.primary }}
                    />
                    <div
                      className="h-6 w-6 rounded"
                      style={{ backgroundColor: preset.secondary }}
                    />
                  </div>
                  <span className="text-sm">{preset.name}</span>
                </div>
              </Button>
            ))}
          </div>
        </div>

        <div className="border rounded-lg p-4">
          <Label className="mb-2 block">Preview</Label>
          <div className="space-y-3">
            <div
              className="h-12 rounded-lg flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: colors.primary }}
            >
              Botão Principal
            </div>
            <div
              className="h-12 rounded-lg flex items-center justify-center text-white font-semibold"
              style={{ backgroundColor: colors.secondary }}
            >
              Botão Secundário
            </div>
            <div className="flex gap-2">
              <div
                className="flex-1 h-20 rounded-lg"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
                }}
              />
            </div>
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={loading}
          variant="gradient"
          className="w-full"
        >
          {loading ? "Salvando..." : "Salvar Personalização"}
        </Button>
      </CardContent>
    </Card>
  );
}
