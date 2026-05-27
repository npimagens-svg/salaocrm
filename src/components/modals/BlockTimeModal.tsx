import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Professional, canBookOnAgenda } from "@/hooks/useProfessionals";
import { Ban } from "lucide-react";

interface BlockTimeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  professionals: Professional[];
  onSubmit: (data: BlockTimeData) => void;
  isLoading?: boolean;
  defaultDate?: Date;
  defaultProfessionalId?: string;
  defaultTime?: string;
}

export interface BlockTimeData {
  professional_id: string;
  date: string;
  time: string;
  duration_minutes: number;
  reason: string;
}

export function BlockTimeModal({
  open,
  onOpenChange,
  professionals,
  onSubmit,
  isLoading,
  defaultDate,
  defaultProfessionalId,
  defaultTime,
}: BlockTimeModalProps) {
  const [formData, setFormData] = useState<BlockTimeData>({
    professional_id: "",
    date: "",
    time: "",
    duration_minutes: 30,
    reason: "",
  });

  useEffect(() => {
    if (open) {
      const date = defaultDate || new Date();
      setFormData({
        professional_id: defaultProfessionalId || "",
        date: date.toISOString().split("T")[0],
        time: defaultTime || date.toTimeString().slice(0, 5),
        duration_minutes: 30,
        reason: "",
      });
    }
  }, [open, defaultDate, defaultProfessionalId, defaultTime]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.reason.trim()) {
      return;
    }
    
    onSubmit(formData);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5 text-destructive" />
            Bloquear Horário
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Profissional *</Label>
            <Select 
              value={formData.professional_id} 
              onValueChange={(v) => setFormData({ ...formData, professional_id: v })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um profissional" />
              </SelectTrigger>
              <SelectContent>
                {professionals.filter(canBookOnAgenda).map((pro) => (
                  <SelectItem key={pro.id} value={pro.id}>
                    {pro.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="block-date">Data *</Label>
              <Input
                id="block-date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="block-time">Horário *</Label>
              <Input
                id="block-time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="block-duration">Duração (min)</Label>
            <Select 
              value={formData.duration_minutes.toString()} 
              onValueChange={(v) => setFormData({ ...formData, duration_minutes: parseInt(v) })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 minutos</SelectItem>
                <SelectItem value="60">1 hora</SelectItem>
                <SelectItem value="90">1h30</SelectItem>
                <SelectItem value="120">2 horas</SelectItem>
                <SelectItem value="180">3 horas</SelectItem>
                <SelectItem value="240">4 horas</SelectItem>
                <SelectItem value="480">8 horas (dia inteiro)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="block-reason">Motivo do bloqueio *</Label>
            <Textarea
              id="block-reason"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              placeholder="Informe o motivo do bloqueio (ex: Almoço, Reunião, Folga...)"
              rows={2}
              required
            />
            {!formData.reason.trim() && (
              <p className="text-xs text-destructive">Motivo é obrigatório</p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              variant="destructive"
              disabled={isLoading || !formData.professional_id || !formData.reason.trim()}
            >
              {isLoading ? "Bloqueando..." : "Bloquear Horário"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
