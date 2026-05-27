// @ts-nocheck
import { ReactNode } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useClientPortal } from "@/hooks/useClientPortal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, LogOut, User, Sparkles } from "lucide-react";

export function ClientLayout({ children }: { children: ReactNode }) {
  const { client, isAuthenticated, logout } = useClientPortal();
  const navigate = useNavigate();
  const location = useLocation();

  const initials = (client?.name || "U")
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const tabs = [
    { to: "/cliente/agendar", icon: Calendar, label: "Agendar" },
    { to: "/cliente/agendamentos", icon: Sparkles, label: "Meus horários" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur border-b">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to={isAuthenticated ? "/cliente/agendar" : "/cliente"} className="flex items-center gap-2 font-bold">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>NP Hair Studio</span>
          </Link>
          {isAuthenticated && client && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate("/cliente/perfil")}
                className="flex items-center gap-2 text-sm"
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden sm:inline truncate max-w-[120px]">
                  {client.name.split(" ")[0]}
                </span>
              </button>
              <Button
                variant="ghost"
                size="icon"
                onClick={async () => {
                  await logout();
                  navigate("/cliente");
                }}
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </header>

      {isAuthenticated && (
        <nav className="bg-background/60 backdrop-blur border-b">
          <div className="max-w-3xl mx-auto px-4 flex gap-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = location.pathname.startsWith(t.to);
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors ${
                    active
                      ? "border-primary text-primary font-medium"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {t.label}
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      <main className="max-w-3xl mx-auto px-4 py-6">{children}</main>

      <footer className="text-center text-xs text-muted-foreground py-6">
        Portal cliente • NP Hair Studio
      </footer>
    </div>
  );
}
