import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Menu, LogOut, FileText } from "lucide-react";
import { useState } from "react";

export default function Header() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <button
          onClick={() => setLocation("/editor")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-accent-foreground" />
          </div>
          <span className="font-semibold text-foreground hidden sm:inline">
            Mapa de Risco IA
          </span>
        </button>

        <div className="flex items-center gap-4">
          <nav className="hidden sm:flex items-center gap-4">
            <button
              onClick={() => setLocation("/editor")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Novo Mapa
            </button>
            <button
              onClick={() => setLocation("/maps")}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Meus Mapas
            </button>
          </nav>

          <div className="relative">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <Menu className="w-5 h-5 text-foreground" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-card border border-border rounded-lg shadow-lg">
                <div className="p-3 border-b border-border">
                  <p className="text-sm font-medium text-foreground">
                    {user?.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>

                <nav className="p-2 space-y-1 sm:hidden">
                  <button
                    onClick={() => {
                      setLocation("/editor");
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                  >
                    Novo Mapa
                  </button>
                  <button
                    onClick={() => {
                      setLocation("/maps");
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                  >
                    Meus Mapas
                  </button>
                </nav>

                <button
                  onClick={() => {
                    handleLogout();
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded transition-colors border-t border-border mt-2 pt-2"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
