// @ts-nocheck
import { useState, useRef, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/dynamicSupabaseClient";
import { useQueryClient } from "@tanstack/react-query";
import { Upload, FileSpreadsheet, FileCode, Loader2, CheckCircle2, Link2, Plus, ArrowDownToLine } from "lucide-react";
import * as XLSX from "xlsx";
import { ProductSearchSelect } from "@/components/shared/ProductSearchSelect";

/** Remove lixo do começo do nome da NF (ex: "*_* SHAMPOO..." -> "SHAMPOO...") */
function cleanName(s: string) {
  return String(s || "").replace(/^[\*_\s.\-]+/, "").trim();
}

/** Campos da planilha (caminho secundário). NF-e XML é detectado e lido automaticamente. */
const FIELDS = [
  { key: "sku", label: "Código / SKU" },
  { key: "name", label: "Produto / Descrição", required: true },
  { key: "quantity", label: "Quantidade", required: true },
  { key: "cost_price", label: "Custo unitário" },
  { key: "sale_price", label: "Preço de venda" },
  { key: "category", label: "Categoria" },
  { key: "brand", label: "Marca" },
  { key: "unit_of_measure", label: "Unidade (ml/g/un)" },
];

function parseNum(v: any): number {
  if (v === null || v === undefined || v === "") return 0;
  if (typeof v === "number") return v;
  let s = String(v).replace(/[^0-9.,-]/g, "").trim();
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

function norm(s: any) {
  return String(s ?? "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function digits(s: any) {
  return String(s ?? "").replace(/\D/g, "");
}

function detectVolume(name: string): { qty: number; unit: string } {
  const m = String(name).toUpperCase().match(/(\d+)\s*(ML|G|L)\b/);
  if (m) return { qty: parseInt(m[1]), unit: m[2] === "ML" ? "ml" : m[2] === "L" ? "ml" : "g" };
  return { qty: 1, unit: "unidade" };
}

/** Lê o tag local (ignora namespace) */
function tagText(parent: Element | Document, tag: string): string {
  const el = parent.getElementsByTagName(tag)[0];
  return el ? el.textContent?.trim() ?? "" : "";
}

/** Parser NF-e: extrai emitente + itens (det/prod) */
function parseNFe(xmlText: string) {
  const doc = new DOMParser().parseFromString(xmlText, "text/xml");
  if (doc.getElementsByTagName("parsererror").length) throw new Error("XML inválido.");
  const emit = doc.getElementsByTagName("emit")[0];
  if (!emit) throw new Error("Não parece um XML de NF-e (sem <emit>).");
  const supplier = {
    name: tagText(emit, "xNome"),
    doc: tagText(emit, "CNPJ") || tagText(emit, "CPF"),
  };
  const ide = doc.getElementsByTagName("ide")[0];
  const nf = ide ? tagText(ide, "nNF") : tagText(doc, "nNF");
  const serie = ide ? tagText(ide, "serie") : "";
  const emissao = (ide ? tagText(ide, "dhEmi") : "").slice(0, 10);
  const infNFe = doc.getElementsByTagName("infNFe")[0];
  const chave = (infNFe?.getAttribute("Id") || "").replace(/^NFe/, "");

  // Duplicatas (boletos) -> contas a pagar
  const cobr = doc.getElementsByTagName("cobr")[0];
  const dups = cobr
    ? Array.from(cobr.getElementsByTagName("dup")).map((d, i) => ({
        n: tagText(d, "nDup") || String(i + 1),
        venc: tagText(d, "dVenc"),
        val: parseNum(tagText(d, "vDup")),
      })).filter((d) => d.val > 0)
    : [];

  const dets = Array.from(doc.getElementsByTagName("det"));
  const items = dets.map((det) => {
    const prod = det.getElementsByTagName("prod")[0];
    if (!prod) return null;
    return {
      sku: tagText(prod, "cProd"),
      name: tagText(prod, "xProd"),
      quantity: parseNum(tagText(prod, "qCom")),
      cost: parseNum(tagText(prod, "vUnCom")),
      sale: 0,
      category: "",
      brand: "",
      unit: "",
    };
  }).filter(Boolean);
  if (!items.length) throw new Error("Nenhum produto encontrado no XML.");
  return { supplier, nf, serie, emissao, chave, dups, items };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products: any[];
  suppliers: any[];
}

export function StockImportModal({ open, onOpenChange, products, suppliers }: Props) {
  const { toast } = useToast();
  const { salonId } = useAuth();
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<"upload" | "mapping" | "review" | "importing" | "done">("upload");
  const [source, setSource] = useState<"xml" | "sheet">("xml");
  const [fileName, setFileName] = useState("");
  const [docRef, setDocRef] = useState(""); // ex: "NF 259298" ou nome do arquivo
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[][]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});

  // fornecedor
  const [supplierMode, setSupplierMode] = useState<string>("none"); // "none" | "<id>" | "__new__"
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierDoc, setNewSupplierDoc] = useState("");

  const [rows, setRows] = useState<any[]>([]);
  const [result, setResult] = useState({ linked: 0, created: 0, units: 0, payables: 0 });
  // Contas a pagar (boletos do XML)
  const [nfMeta, setNfMeta] = useState<{ serie: string; chave: string; emissao: string }>({ serie: "", chave: "", emissao: "" });
  const [dups, setDups] = useState<{ n: string; venc: string; val: number }[]>([]);
  const [launchPayable, setLaunchPayable] = useState(true);

  const reset = () => {
    setStep("upload"); setSource("xml"); setFileName(""); setDocRef("");
    setHeaders([]); setRawRows([]); setMapping({});
    setSupplierMode("none"); setNewSupplierName(""); setNewSupplierDoc("");
    setRows([]); setResult({ linked: 0, created: 0, units: 0, payables: 0 });
    setNfMeta({ serie: "", chave: "", emissao: "" }); setDups([]); setLaunchPayable(true);
  };
  const close = (v: boolean) => { if (!v) reset(); onOpenChange(v); };

  // Resolve produto por SKU (depois nome)
  const productIndex = useMemo(() => {
    const bySku = new Map<string, any>();
    const byName = new Map<string, any>();
    for (const p of products) {
      if (p.sku) bySku.set(norm(p.sku), p);
      byName.set(norm(p.name), p);
    }
    return { bySku, byName };
  }, [products]);

  const resolveRows = (items: any[]) =>
    items
      .filter((it) => it.name && it.quantity > 0)
      .map((it) => {
        let match = it.sku ? productIndex.bySku.get(norm(it.sku)) : null;
        if (!match) match = productIndex.byName.get(norm(it.name));
        return {
          ...it,
          newName: cleanName(it.name),
          linkId: match?.id || null,
          linkName: match?.name || null,
          linkStock: match ? Number(match.current_stock ?? 0) : 0,
          salePrice: it.sale ? String(it.sale) : "",
        };
      });

  /** Pré-seleciona fornecedor pelo CNPJ/CPF do emitente */
  const resolveSupplier = (sup: { name: string; doc: string }) => {
    const d = digits(sup.doc);
    const existing = d ? suppliers.find((s) => digits(s.document) === d) : null;
    if (existing) {
      setSupplierMode(existing.id);
    } else {
      setSupplierMode("__new__");
      setNewSupplierName(sup.name || "");
      setNewSupplierDoc(sup.doc || "");
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const isXml = /\.xml$/i.test(file.name);
    try {
      if (isXml) {
        const text = await file.text();
        const { supplier, nf, serie, emissao, chave, dups: nfDups, items } = parseNFe(text);
        setSource("xml");
        setDocRef(nf ? `NF ${nf}` : file.name);
        setNfMeta({ serie, chave, emissao });
        setDups(nfDups);
        setLaunchPayable(nfDups.length > 0);
        resolveSupplier(supplier);
        setRows(resolveRows(items));
        setStep("review");
      } else {
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });
        if (json.length < 2) {
          toast({ title: "Arquivo vazio", description: "Precisa ter cabeçalho + dados.", variant: "destructive" });
          return;
        }
        const hdrs = (json[0] as string[]).map((h) => String(h || "").trim());
        const body = json.slice(1).filter((r: any[]) => r.some((c) => c !== null && c !== undefined && c !== ""));
        setSource("sheet");
        setDocRef(file.name);
        setHeaders(hdrs);
        setRawRows(body);
        const auto: Record<string, string> = {};
        for (const f of FIELDS) {
          const hit = hdrs.find((h) => {
            const hn = norm(h);
            const aliases: Record<string, string[]> = {
              sku: ["codigo", "cod", "sku", "ref", "referencia", "ean"],
              name: ["produto", "descricao", "nome", "item", "mercadoria"],
              quantity: ["quantidade", "qtd", "qtde", "qty"],
              cost_price: ["custo", "valor unitario", "vl unit", "preco custo", "vlr unit", "unitario"],
              sale_price: ["venda", "preco venda", "preco de venda"],
              category: ["categoria", "grupo"],
              brand: ["marca", "fabricante"],
              unit_of_measure: ["unidade", "medida"],
            };
            return hn === norm(f.label) || (aliases[f.key] || []).some((a) => hn === a || hn.includes(a));
          });
          if (hit) auto[f.key] = hit;
        }
        setMapping(auto);
        setStep("mapping");
      }
    } catch (err: any) {
      toast({ title: "Erro ao ler arquivo", description: err.message || "Arquivo inválido.", variant: "destructive" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const buildReviewFromSheet = () => {
    const missing = FIELDS.filter((f) => f.required && !mapping[f.key]);
    if (missing.length) {
      toast({ title: "Faltou mapear", description: missing.map((f) => f.label).join(", "), variant: "destructive" });
      return;
    }
    const col = (key: string) => headers.indexOf(mapping[key]);
    const items = rawRows.map((r) => {
      const get = (k: string) => { const i = col(k); return i >= 0 ? r[i] : null; };
      return {
        sku: mapping.sku ? String(get("sku") ?? "").trim() : "",
        name: String(get("name") ?? "").trim(),
        quantity: parseNum(get("quantity")),
        cost: mapping.cost_price ? parseNum(get("cost_price")) : 0,
        sale: mapping.sale_price ? parseNum(get("sale_price")) : 0,
        category: mapping.category ? String(get("category") ?? "").trim() : "",
        brand: mapping.brand ? String(get("brand") ?? "").trim() : "",
        unit: mapping.unit_of_measure ? String(get("unit_of_measure") ?? "").trim() : "",
      };
    });
    setRows(resolveRows(items));
    setStep("review");
  };

  const updateRow = (i: number, patch: any) =>
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  const counts = useMemo(() => ({
    link: rows.filter((r) => r.linkId).length,
    create: rows.filter((r) => !r.linkId).length,
    units: rows.reduce((s, r) => s + r.quantity, 0),
  }), [rows]);

  // Cadastros novos precisam de preço de venda
  const missingPrice = useMemo(
    () => rows.filter((r) => !r.linkId && (!r.salePrice || parseNum(r.salePrice) <= 0)).length,
    [rows]
  );

  const commit = async () => {
    if (!salonId) { toast({ title: "Salão não encontrado", variant: "destructive" }); return; }
    setStep("importing");
    try {
      let supplierId: string | null = null;
      if (supplierMode === "__new__") {
        if (!newSupplierName.trim()) throw new Error("Informe o nome do novo fornecedor.");
        const { data, error } = await supabase
          .from("suppliers")
          .insert({ salon_id: salonId, name: newSupplierName.trim(), document: newSupplierDoc.trim() || null, is_active: true })
          .select("id").single();
        if (error) throw error;
        supplierId = data.id;
      } else if (supplierMode !== "none") {
        supplierId = supplierMode;
      }

      let linked = 0, created = 0, units = 0;
      const notesBase = `Entrada ${source === "xml" ? "via XML NF-e" : "via planilha"} (${docRef || fileName})`;
      const byId = new Map(products.map((p) => [p.id, p]));

      for (const r of rows) {
        if (r.linkId) {
          // Vincular a um produto já cadastrado: soma estoque, NÃO mexe no preço de venda dele
          const target: any = byId.get(r.linkId);
          const prev = Number(target?.current_stock ?? 0);
          const next = prev + r.quantity;
          const patch: any = { current_stock: next, current_stock_fractional: next, updated_at: new Date().toISOString() };
          if (r.cost > 0) patch.cost_price = r.cost;
          if (supplierId) patch.supplier_id = supplierId;
          const { error: upErr } = await supabase.from("products").update(patch).eq("id", r.linkId);
          if (upErr) throw upErr;
          await supabase.from("stock_movements").insert({
            salon_id: salonId, product_id: r.linkId, movement_type: "entry",
            quantity: r.quantity, previous_stock: prev, new_stock: next, notes: notesBase,
          });
          linked++; units += r.quantity;
        } else {
          // Criar novo produto com o preço de venda digitado
          const vol = detectVolume(r.newName || r.name);
          const { data: prod, error: insErr } = await supabase.from("products").insert({
            salon_id: salonId,
            name: (r.newName || r.name).trim(),
            sku: r.sku || null,
            category: r.category || null,
            brand: r.brand || null,
            cost_price: r.cost || 0,
            sale_price: parseNum(r.salePrice),
            current_stock: r.quantity,
            current_stock_fractional: r.quantity,
            min_stock: 1,
            is_active: true,
            is_for_resale: true,
            is_for_consumption: true,
            unit_of_measure: r.unit || vol.unit,
            unit_quantity: vol.qty,
            commission_percent: 0,
            supplier_id: supplierId,
            description: `Cadastrado na ${notesBase}.`,
          }).select("id").single();
          if (insErr) throw insErr;
          await supabase.from("stock_movements").insert({
            salon_id: salonId, product_id: prod.id, movement_type: "entry",
            quantity: r.quantity, previous_stock: 0, new_stock: r.quantity, notes: `${notesBase} — cadastro novo`,
          });
          created++; units += r.quantity;
        }
      }

      // Contas a Pagar — lança os boletos (duplicatas) da NF-e
      let payables = 0;
      if (source === "xml" && launchPayable && dups.length > 0) {
        const nfNum = docRef.replace(/^NF\s*/i, "").trim();
        let already: any[] = [];
        if (nfMeta.chave) {
          const { data } = await supabase.from("accounts_payable").select("id").eq("salon_id", salonId).eq("nf_chave", nfMeta.chave).limit(1);
          already = data || [];
        }
        if (already.length === 0) {
          const rowsAP = dups.map((d) => ({
            salon_id: salonId,
            supplier_id: supplierId,
            nf_numero: nfNum || null,
            nf_serie: nfMeta.serie || null,
            nf_chave: nfMeta.chave || null,
            parcela: Number(d.n) || 1,
            total_parcelas: dups.length,
            valor_original: d.val,
            emissao: nfMeta.emissao || null,
            due_date: d.venc,
            status: "pending",
            description: `Boleto ${d.n}/${dups.length} — ${notesBase}`,
            category: "Estoque",
            payment_method: "boleto",
            notes: notesBase,
          }));
          const { error: apErr } = await supabase.from("accounts_payable").insert(rowsAP);
          if (apErr) throw apErr;
          payables = rowsAP.length;
        }
      }

      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["products", salonId] });
      qc.invalidateQueries({ queryKey: ["suppliers", salonId] });
      qc.invalidateQueries({ queryKey: ["accounts_payable", salonId] });
      setResult({ linked, created, units, payables });
      setStep("done");
    } catch (err: any) {
      toast({ title: "Erro ao dar entrada", description: err.message, variant: "destructive" });
      setStep("review");
    }
  };

  const supplierBlock = (
    <div className="rounded-lg border p-3 space-y-3 bg-muted/30">
      <Label className="text-sm font-medium">Fornecedor desta entrada</Label>
      <Select value={supplierMode} onValueChange={setSupplierMode}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">— Sem fornecedor —</SelectItem>
          <SelectItem value="__new__">+ Cadastrar novo fornecedor</SelectItem>
          {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {supplierMode === "__new__" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Input placeholder="Nome do fornecedor *" value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} />
          <Input placeholder="CNPJ/CPF (opcional)" value={newSupplierDoc} onChange={(e) => setNewSupplierDoc(e.target.value)} />
        </div>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode className="h-5 w-5 text-primary" /> Importar Entrada de Estoque (XML da NF-e)
          </DialogTitle>
          <DialogDescription>
            Suba o XML da NF-e. O sistema lê os produtos, identifica o fornecedor pelo emitente, casa pelo código,
            cria o cadastro do que faltar e dá entrada no estoque. Também aceita planilha (XLS/CSV).
          </DialogDescription>
        </DialogHeader>

        {step === "upload" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-10 text-center w-full cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">Arraste o XML da NF-e ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground">Formatos: .xml (NF-e), .xlsx, .xls, .csv</p>
              <input ref={fileInputRef} type="file" accept=".xml,.xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
            </div>
          </div>
        )}

        {step === "mapping" && (
          <ScrollArea className="flex-1 max-h-[55vh]">
            <div className="space-y-4 p-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1"><FileSpreadsheet className="h-3.5 w-3.5" />{fileName}</Badge>
                <span className="text-xs text-muted-foreground">{rawRows.length} linhas</span>
              </div>
              <p className="text-sm font-medium">Relacione as colunas da planilha:</p>
              {FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <div className="w-44 text-sm">{f.label}{f.required && <span className="text-destructive ml-1">*</span>}</div>
                  <Select value={mapping[f.key] || "__none__"} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === "__none__" ? "" : v }))}>
                    <SelectTrigger className="flex-1"><SelectValue placeholder="Selecione a coluna" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Ignorar —</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {step === "review" && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <div className="space-y-3 p-1">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  {source === "xml" ? <FileCode className="h-3.5 w-3.5" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                  {docRef || fileName}
                </Badge>
              </div>
              {supplierBlock}
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1">
                  <Link2 className="h-3.5 w-3.5" /> {counts.link} vão vincular
                </Badge>
                <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1">
                  <Plus className="h-3.5 w-3.5" /> {counts.create} cadastros novos
                </Badge>
                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                  <ArrowDownToLine className="h-3.5 w-3.5" /> {counts.units} un. de entrada
                </Badge>
              </div>
              {missingPrice > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  ⚠ {missingPrice} produto(s) novo(s) sem preço de venda — preencha o preço ou vincule a um produto já cadastrado.
                </p>
              )}

              <div className="space-y-2">
                {rows.map((r, i) => (
                  <div key={i} className="rounded-lg border p-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" title={r.name}>{r.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Item da NF · {r.sku ? `cód ${r.sku} · ` : ""}{r.quantity} un{r.cost ? ` · custo R$ ${r.cost.toFixed(2)}` : ""}
                        </p>
                      </div>
                      {r.linkId ? (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 shrink-0 gap-1"><Link2 className="h-3 w-3" />Vinculado</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 shrink-0 gap-1"><Plus className="h-3 w-3" />Vai criar novo</Badge>
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground mb-1">Opção 1 — vincular a um produto JÁ cadastrado (mesmo com outro nome):</p>
                      <ProductSearchSelect
                        products={products}
                        value={r.linkId}
                        onSelect={(id, p) => updateRow(i, { linkId: id, linkName: p?.name || null, linkStock: Number(p?.current_stock ?? 0) })}
                        placeholder="Buscar produto cadastrado por nome ou código..."
                      />
                    </div>

                    {r.linkId ? (
                      <p className="text-xs text-blue-700">
                        ✓ Vai dar entrada em <b>{r.linkName}</b> (estoque {r.linkStock} → {r.linkStock + r.quantity}). O preço de venda do cadastro é mantido.
                      </p>
                    ) : (
                      <div className="rounded-md bg-amber-50/70 border border-amber-200 p-2 space-y-1.5">
                        <p className="text-[11px] font-medium text-amber-800">Opção 2 — cadastrar como produto NOVO (defina o nome e o preço de venda):</p>
                        <div className="grid grid-cols-1 sm:grid-cols-[1fr_150px] gap-2">
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Nome do novo produto</Label>
                            <Input
                              value={r.newName}
                              onChange={(e) => updateRow(i, { newName: e.target.value })}
                              placeholder="Nome do produto"
                              className="h-9"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-muted-foreground">Preço de venda *</Label>
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                              <Input
                                value={r.salePrice}
                                onChange={(e) => updateRow(i, { salePrice: e.target.value })}
                                placeholder="0,00"
                                inputMode="decimal"
                                className={`h-9 pl-8 ${(!r.salePrice || parseNum(r.salePrice) <= 0) ? "border-amber-400 focus-visible:ring-amber-400" : ""}`}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {source === "xml" && (
                <div className="rounded-lg border p-3 space-y-2 bg-muted/30">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Contas a Pagar (boletos da NF)</Label>
                    {dups.length > 0 && (
                      <label className="flex items-center gap-2 text-xs cursor-pointer">
                        <Checkbox checked={launchPayable} onCheckedChange={(v) => setLaunchPayable(!!v)} />
                        Lançar
                      </label>
                    )}
                  </div>
                  {dups.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum boleto na nota (à vista ou bonificação) — nada a lançar.</p>
                  ) : launchPayable ? (
                    <div className="space-y-1">
                      {dups.map((d, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Parcela {d.n}/{dups.length} · venc {d.venc.split("-").reverse().join("/")}</span>
                          <span className="font-medium">R$ {d.val.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">{dups.length} boleto(s) detectado(s) — desmarcado, não vai lançar.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Dando entrada no estoque...</p>
          </div>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium">Entrada concluída!</p>
            <p className="text-sm text-muted-foreground">
              {result.linked} produto(s) vinculado(s) · {result.created} novo(s) cadastro(s) · {result.units} unidade(s) em estoque{result.payables > 0 ? ` · ${result.payables} boleto(s) em Contas a Pagar` : ""}.
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "mapping" && (
            <div className="flex gap-2 w-full justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>Voltar</Button>
              <Button onClick={buildReviewFromSheet}>Próximo: Conferir</Button>
            </div>
          )}
          {step === "review" && (
            <div className="flex gap-2 w-full justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>Trocar arquivo</Button>
              <Button onClick={commit} disabled={rows.length === 0 || missingPrice > 0} className="gap-2">
                <ArrowDownToLine className="h-4 w-4" /> Dar entrada no estoque ({rows.length})
              </Button>
            </div>
          )}
          {step === "done" && <Button onClick={() => close(false)} className="w-full">Fechar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
