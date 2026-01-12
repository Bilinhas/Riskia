import { Trash2 } from "lucide-react";

interface Risk {
  id: number;
  type: string;
  severity: string;
  label: string;
  description: string | null;
  color: string;
  radius: number;
}

interface RiskLegendProps {
  risks: Risk[];
  onDeleteRisk: (riskId: number) => void;
  isReadOnly?: boolean;
}

const severityLabels: Record<string, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
  critical: "Crítica",
};

const typeLabels: Record<string, string> = {
  acidental: "Acidental",
  chemical: "Químico",
  ergonomic: "Ergonômico",
  physical: "Físico",
  biological: "Biológico",
};

export default function RiskLegend({ risks, onDeleteRisk, isReadOnly = false }: RiskLegendProps) {
  return (
    <div className="space-y-3">
      {risks.map((risk, index) => (
        <div
          key={`risk-legend-${risk.id}-${index}`}
          className="flex items-center gap-4 p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
        >
          {/* Color Circle */}
          <div
            className="flex-shrink-0 rounded-full border-2 border-white shadow-sm"
            style={{
              width: `${Math.min(risk.radius, 30)}px`,
              height: `${Math.min(risk.radius, 30)}px`,
              backgroundColor: risk.color,
              opacity: 0.7,
            }}
          />

          {/* Risk Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-medium text-foreground truncate">
                {risk.label}
              </h3>
              <span className="text-xs px-2 py-1 bg-background rounded text-foreground whitespace-nowrap">
                {typeLabels[risk.type] || risk.type}
              </span>
              <span
                className={`text-xs px-2 py-1 rounded whitespace-nowrap ${getSeverityBadgeClass(
                  risk.severity
                )}`}
              >
                {severityLabels[risk.severity] || risk.severity}
              </span>
            </div>
            {risk.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">
                {risk.description}
              </p>
            )}
          </div>

          {/* Delete Button */}
          {!isReadOnly && (
            <button
              onClick={() => onDeleteRisk(risk.id)}
              className="flex-shrink-0 p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              title="Remover risco"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function getSeverityBadgeClass(severity: string): string {
  const classes: Record<string, string> = {
    low: "bg-green-100 text-green-800",
    medium: "bg-yellow-100 text-yellow-800",
    high: "bg-orange-100 text-orange-800",
    critical: "bg-red-100 text-red-800",
  };
  return classes[severity] || "bg-gray-100 text-gray-800";
}
