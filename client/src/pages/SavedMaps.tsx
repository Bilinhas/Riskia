import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Trash2, Edit2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import Header from "@/components/Header";

export default function SavedMaps() {
  const [, setLocation] = useLocation();
  const { data: maps, isLoading } = trpc.riskMaps.list.useQuery();
  const deleteMapMutation = trpc.riskMaps.delete.useMutation();

  const handleDelete = async (mapId: number) => {
    if (!confirm("Tem certeza que deseja deletar este mapa?")) return;

    try {
      await deleteMapMutation.mutateAsync({ mapId });
      toast.success("Mapa deletado com sucesso!");
    } catch (error) {
      console.error("Error deleting map:", error);
      toast.error("Erro ao deletar mapa");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-4xl font-light text-foreground mb-2">
                Meus Mapas
              </h1>
              <p className="text-muted-foreground">
                Gerencie seus mapas de risco salvos
              </p>
            </div>

            <Button
              onClick={() => setLocation("/editor")}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Mapa
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !maps || maps.length === 0 ? (
            <Card className="p-12 text-center bg-card border-2 border-dashed border-border">
              <p className="text-muted-foreground mb-4">
                Você ainda não tem nenhum mapa salvo
              </p>
              <Button onClick={() => setLocation("/editor")}>
                Criar Primeiro Mapa
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {maps.map((map) => (
                <Card
                  key={map.id}
                  className="p-6 hover:shadow-lg transition-shadow bg-card"
                >
                  <h3 className="text-lg font-semibold text-foreground mb-2 truncate">
                    {map.title}
                  </h3>

                  <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                    {map.description}
                  </p>

                  <div className="text-xs text-muted-foreground mb-4">
                    Criado em{" "}
                    {new Date(map.createdAt).toLocaleDateString("pt-BR")}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => setLocation(`/editor/${map.id}`)}
                      variant="outline"
                      className="flex-1 flex items-center justify-center gap-2"
                    >
                      <Edit2 className="h-4 w-4" />
                      Editar
                    </Button>

                    <Button
                      onClick={() => handleDelete(map.id)}
                      variant="outline"
                      className="flex-1 flex items-center justify-center gap-2 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      Deletar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
