import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  hint,
  accent,
  large = false,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "success" | "warning";
  large?: boolean;
}) {
  return (
    <Card>
      <CardContent className={large ? "p-6" : "p-4"}>
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        <div
          className={
            "mt-2 font-sans tabular-nums font-normal break-words " + (large ? "text-5xl text-primary " : "text-2xl ") +
            (accent === "success"
              ? "text-[color:var(--color-success)]"
              : accent === "warning"
                ? "text-[color:var(--color-warning)]"
                : large ? "text-primary" : "text-foreground")
          }
        >
          {value}
        </div>
        {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}
