import { Bell, Link2, HelpCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQuery } from "@tanstack/react-query";

export function AppHeaderNew() {
  const { user, salonId, signOut } = useAuth();
  const navigate = useNavigate();

  // Fetch salon info
  const { data: salon } = useQuery({
    queryKey: ["salon", salonId],
    queryFn: async () => {
      if (!salonId) return null;
      const { data, error } = await supabase
        .from("salons")
        .select("*")
        .eq("id", salonId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!salonId,
  });

  // Fetch user profile
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

  return (
    <header className="sticky top-0 z-50 flex h-14 md:h-16 items-center justify-between border-b bg-background px-3 md:px-6">
      {/* Logo and Salon Name */}
      <div className="flex items-center gap-2 md:gap-4">
        <button 
          onClick={() => navigate("/")}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
        >
          {salon?.logo_url ? (
            <Avatar className="h-8 w-8 md:h-10 md:w-10 rounded-lg">
              <AvatarImage src={salon.logo_url} className="object-cover rounded-lg" />
              <AvatarFallback className="rounded-lg bg-primary text-primary-foreground font-bold text-lg md:text-xl">
                {salon?.name?.charAt(0)?.toUpperCase() || "S"}
              </AvatarFallback>
            </Avatar>
          ) : (
            <div className="flex h-8 w-8 md:h-10 md:w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold text-lg md:text-xl">
              {salon?.name?.charAt(0)?.toUpperCase() || "S"}
            </div>
          )}
          <span className="text-lg md:text-xl font-bold text-primary hidden sm:block">
            {(salon as any)?.trade_name || salon?.name || "Meu Salão"}
          </span>
        </button>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Links dropdown - hidden on very small screens */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 h-8 px-2 md:px-3">
              <Link2 className="h-4 w-4" />
              <span className="hidden md:inline">Links</span>
              <ChevronDown className="h-3 w-3 hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem>Link de Agendamento</DropdownMenuItem>
            <DropdownMenuItem>Página do Salão</DropdownMenuItem>
            <DropdownMenuItem>Compartilhar no WhatsApp</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Help button - icon only on mobile */}
        <Button
          variant="default"
          size="sm"
          className="gap-1 h-8 px-2 md:px-3"
          onClick={() => navigate("/ajuda")}
        >
          <HelpCircle className="h-4 w-4" />
          <span className="hidden md:inline">Central de Ajuda</span>
        </Button>

        {/* User dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1 md:gap-2 pl-1 md:pl-2 pr-1 md:pr-3 h-8">
              <Avatar className="h-7 w-7 md:h-8 md:w-8">
                <AvatarImage src={profile?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="hidden lg:inline font-medium text-sm">
                {profile?.full_name || "Usuário"}
              </span>
              <ChevronDown className="h-3 w-3 hidden sm:block" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/perfil")}>
              Meu Perfil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate("/configuracoes")}>
              Configurações
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive focus:text-destructive"
              onClick={handleSignOut}
            >
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
