import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, Search, Package } from "lucide-react";

interface ProductLite {
  id: string;
  name: string;
  sku?: string | null;
  current_stock?: number | null;
  sale_price?: number | null;
}

interface Props {
  products: ProductLite[];
  value: string | null;
  onSelect: (productId: string | null, product?: ProductLite) => void;
  placeholder?: string;
}

export function ProductSearchSelect({ products, value, onSelect, placeholder = "Buscar produto cadastrado..." }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = products.find((p) => p.id === value);
  const q = search.toLowerCase();
  const filtered = products.filter(
    (p) => p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q)
  );

  const handleSelect = (id: string) => {
    const p = products.find((x) => x.id === id);
    onSelect(id, p);
    setSearch("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            value={open ? search : (selected?.name || "")}
            onChange={(e) => { e.stopPropagation(); setSearch(e.target.value); if (!open) setOpen(true); }}
            onClick={(e) => { e.stopPropagation(); if (!open) setOpen(true); }}
            onFocus={() => { if (!open) setOpen(true); }}
            onKeyDown={(e) => e.stopPropagation()}
            className="pl-9 pr-8 h-9"
          />
          {selected && !open && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={(e) => { e.stopPropagation(); onSelect(null); setSearch(""); }}
            >
              ×
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start" onOpenAutoFocus={(e) => e.preventDefault()}>
        <Command shouldFilter={false}>
          <CommandList>
            {filtered.length === 0 ? (
              <CommandEmpty>
                <p className="py-4 text-center text-sm text-muted-foreground">Nenhum produto cadastrado encontrado</p>
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {filtered.slice(0, 20).map((p) => (
                  <CommandItem key={p.id} value={p.id} onSelect={() => handleSelect(p.id)} className="flex items-center gap-2 cursor-pointer">
                    <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.sku ? `Cód ${p.sku} · ` : ""}estoque {Number(p.current_stock ?? 0)}
                      </div>
                    </div>
                    {value === p.id && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
