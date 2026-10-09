import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MODES_CHUTES, type OptionsChutesPDF, type ModeChutesPDF } from "@/lib/offcut-settings";

export function OffcutPDFOptions({ value, onChange }: { value: OptionsChutesPDF; onChange: (v: OptionsChutesPDF) => void }) {
  return <div className="space-y-3 border-t border-border pt-4">
    <Label htmlFor="chutes-pdf">Chutes dans le PDF atelier</Label>
    <Select value={value.mode} onValueChange={mode => onChange({ ...value, mode: mode as ModeChutesPDF })}>
      <SelectTrigger id="chutes-pdf" className="w-full"><SelectValue /></SelectTrigger>
      <SelectContent>{Object.entries(MODES_CHUTES).map(([mode, label]) => <SelectItem key={mode} value={mode}>{label}</SelectItem>)}</SelectContent>
    </Select>
    {value.mode === "instruction" && <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={value.etiquettes} onCheckedChange={v => onChange({ ...value, etiquettes: v === true })} />
      Ajouter une page d’étiquettes
    </label>}
  </div>;
}