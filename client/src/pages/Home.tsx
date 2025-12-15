import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { getLoginUrl } from "@/const";
import { ArrowRight } from "lucide-react";
import { useEffect } from "react";

export default function Home() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  // Redirect to editor when authenticated
  useEffect(() => {
    if (isAuthenticated && !loading) {
      setLocation("/editor");
    }
  }, [isAuthenticated, loading, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-pulse text-foreground">Carregando...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-6">
          <div>
            <h1 className="text-4xl font-light text-foreground mb-2">
              Mapa de Risco IA
            </h1>
            <p className="text-lg text-muted-foreground">
              Gere mapas de risco ocupacional inteligentes com IA
            </p>
          </div>

          <p className="text-muted-foreground">
            Descreva seu ambiente de trabalho e deixe a IA gerar uma planta
            baixa com identificação automática de riscos ocupacionais.
          </p>

          <Button
            onClick={() => (window.location.href = getLoginUrl())}
            className="w-full h-12 text-base"
          >
            Entrar
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  }

  // Render authenticated content
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-pulse text-foreground">Redirecionando...</div>
      </div>
    </div>
  );
}
