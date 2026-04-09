import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import * as XLSX from "xlsx";

export interface ImportField {
  key: string;
  label: string;
  required?: boolean;
}

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fields: ImportField[];
  onImport: (records: Record<string, any>[]) => Promise<void>;
}

export function ImportModal({ open, onOpenChange, title, description, fields, onImport }: ImportModalProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<"upload" | "mapping" | "preview" | "importing" | "done">("upload");
  const [rawData, setRawData] = useState<any[][]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [mappedRecords, setMappedRecords] = useState<Record<string, any>[]>([]);
  const [importResult, setImportResult] = useState({ success: 0, errors: 0 });
  const [fileName, setFileName] = useState("");

  const reset = () => {
    setStep("upload");
    setRawData([]);
    setHeaders([]);
    setMapping({});
    setMappedRecords([]);
    setImportResult({ success: 0, errors: 0 });
    setFileName("");
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

      if (jsonData.length < 2) {
        toast({ title: "Arquivo vazio", description: "O arquivo precisa ter pelo menos 2 linhas (cabeçalho + dados).", variant: "destructive" });
        return;
      }

      const fileHeaders = (jsonData[0] as string[]).map(h => String(h || "").trim());
      const rows = jsonData.slice(1).filter((row: any[]) => row.some(cell => cell !== null && cell !== undefined && cell !== ""));

      setHeaders(fileHeaders);
      setRawData(rows);

      // Auto-map columns by similarity
      const autoMapping: Record<string, string> = {};
      for (const field of fields) {
        const match = fileHeaders.find(h => {
          const hLower = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const fLower = field.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const kLower = field.key.toLowerCase().replace(/_/g, " ");
          return hLower === fLower || hLower === kLower || hLower.includes(fLower) || fLower.includes(hLower);
        });
        if (match) autoMapping[field.key] = match;
      }
      setMapping(autoMapping);
      setStep("mapping");
    } catch (err) {
      toast({ title: "Erro ao ler arquivo", description: "Verifique se o arquivo é um XLS, XLSX ou CSV válido.", variant: "destructive" });
    }

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleMapping = (fieldKey: string, headerValue: string) => {
    setMapping(prev => ({ ...prev, [fieldKey]: headerValue === "__none__" ? "" : headerValue }));
  };

  const goToPreview = () => {
    const requiredFields = fields.filter(f => f.required);
    const missingRequired = requiredFields.filter(f => !mapping[f.key]);
    if (missingRequired.length > 0) {
      toast({
        title: "Campos obrigatórios não mapeados",
        description: `Mapeie: ${missingRequired.map(f => f.label).join(", ")}`,
        variant: "destructive",
      });
      return;
    }

    const records = rawData.map(row => {
      const record: Record<string, any> = {};
      for (const field of fields) {
        const headerName = mapping[field.key];
        if (headerName) {
          const colIndex = headers.indexOf(headerName);
          if (colIndex >= 0) {
            let value = row[colIndex];
            // Clean up values
            if (typeof value === "string") value = value.trim();
            if (value === "" || value === undefined) value = null;
            record[field.key] = value;
          }
        }
      }
      return record;
    }).filter(r => {
      // Filter out rows without required fields
      return requiredFields.every(f => r[f.key] !== null && r[f.key] !== undefined);
    });

    setMappedRecords(records);
    setStep("preview");
  };

  const handleImport = async () => {
    setStep("importing");
    try {
      await onImport(mappedRecords);
      setImportResult({ success: mappedRecords.length, errors: 0 });
      setStep("done");
    } catch (err: any) {
      toast({ title: "Erro na importação", description: err.message, variant: "destructive" });
      setStep("preview");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-xl p-10 text-center w-full relative cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">Arraste um arquivo ou clique para selecionar</p>
              <p className="text-xs text-muted-foreground">Formatos aceitos: .xlsx, .xls, .csv</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === "mapping" && (
          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="space-y-3 p-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary">{fileName}</Badge>
                <span className="text-xs text-muted-foreground">{rawData.length} linhas encontradas</span>
              </div>
              <p className="text-sm font-medium">Mapeie as colunas do arquivo para os campos do sistema:</p>
              {fields.map(field => (
                <div key={field.key} className="flex items-center gap-3">
                  <div className="w-40 text-sm">
                    {field.label}
                    {field.required && <span className="text-destructive ml-1">*</span>}
                  </div>
                  <Select value={mapping[field.key] || "__none__"} onValueChange={(v) => handleMapping(field.key, v)}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecione a coluna" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Ignorar —</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Step 3: Preview */}
        {step === "preview" && (
          <ScrollArea className="flex-1 max-h-[50vh]">
            <div className="space-y-3 p-1">
              <p className="text-sm">
                <strong>{mappedRecords.length}</strong> registros prontos para importar
                {rawData.length - mappedRecords.length > 0 && (
                  <span className="text-muted-foreground"> ({rawData.length - mappedRecords.length} ignorados por falta de dados obrigatórios)</span>
                )}
              </p>
              <Table>
                <TableHeader>
                  <TableRow>
                    {fields.filter(f => mapping[f.key]).map(f => (
                      <TableHead key={f.key} className="text-xs">{f.label}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mappedRecords.slice(0, 10).map((record, i) => (
                    <TableRow key={i}>
                      {fields.filter(f => mapping[f.key]).map(f => (
                        <TableCell key={f.key} className="text-xs py-1.5">
                          {record[f.key] !== null && record[f.key] !== undefined ? String(record[f.key]) : "-"}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {mappedRecords.length > 10 && (
                <p className="text-xs text-muted-foreground text-center">... e mais {mappedRecords.length - 10} registros</p>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Step 4: Importing */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importando {mappedRecords.length} registros...</p>
          </div>
        )}

        {/* Step 5: Done */}
        {step === "done" && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <CheckCircle2 className="h-10 w-10 text-green-500" />
            <p className="text-sm font-medium">{importResult.success} registros importados com sucesso!</p>
          </div>
        )}

        <DialogFooter>
          {step === "mapping" && (
            <div className="flex gap-2 w-full justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>Voltar</Button>
              <Button onClick={goToPreview}>Próximo: Pré-visualizar</Button>
            </div>
          )}
          {step === "preview" && (
            <div className="flex gap-2 w-full justify-between">
              <Button variant="outline" onClick={() => setStep("mapping")}>Voltar</Button>
              <Button onClick={handleImport} className="gap-2">
                <Upload className="h-4 w-4" />
                Importar {mappedRecords.length} registros
              </Button>
            </div>
          )}
          {step === "done" && (
            <Button onClick={() => handleClose(false)} className="w-full">Fechar</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
