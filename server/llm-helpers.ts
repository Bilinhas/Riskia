import { invokeLLM } from "./_core/llm";
import { RiskType, Severity } from "../drizzle/schema";

export interface FloorPlanResponse {
  svg: string;
  width: number;
  height: number;
  elements: string[];
}

export interface IdentifiedRisk {
  type: RiskType;
  severity: Severity;
  label: string;
  description: string;
  suggestedCount: number;
}

/**
 * Generate a floor plan SVG based on user description
 */
export async function generateFloorPlan(
  description: string
): Promise<FloorPlanResponse> {
  const systemPrompt = `You are an expert in creating floor plans from textual descriptions. 
Your task is to generate a clean, minimalist SVG floor plan based on the user's description of a workspace.

IMPORTANT RULES:
1. Return ONLY valid SVG code wrapped in svg tags
2. Use viewBox="0 0 1000 800" for consistency
3. Use simple shapes: rectangles for rooms/walls, circles for furniture, lines for corridors
4. Use stroke="#333" and fill="none" for walls
5. Use stroke="#999" and fill="none" for internal elements
6. Add text labels for key areas (e.g., "Servidor", "Corredor", "Computadores")
7. Make the layout clear and easy to understand
8. Do NOT include any text outside the SVG tags
9. The SVG should represent a top-down view of the space`;

  const userPrompt = `Create an SVG floor plan for this workspace description:

${description}

Generate a clean, minimalist floor plan that accurately represents the layout described. Use rectangles for desks/workstations, circles for equipment, and lines for corridors or pathways.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const messageContent = response.choices[0]?.message.content;
  const content = typeof messageContent === 'string' ? messageContent : '';
  const svgMatch = content.match(/<svg[^>]*>[\s\S]*?<\/svg>/);

  if (!svgMatch) {
    throw new Error("Failed to generate valid SVG floor plan");
  }

  const svg = svgMatch[0];

  return {
    svg,
    width: 1000,
    height: 800,
    elements: extractSvgElements(svg),
  };
}

/**
 * Identify risks based on workspace description
 */
export async function identifyRisks(
  description: string
): Promise<IdentifiedRisk[]> {
  const systemPrompt = `You are an occupational health and safety expert specializing in risk assessment.
Analyze workspace descriptions and identify potential occupational risks.

Risk types to consider:
- acidental: Accidental hazards (falls, collisions, slips)
- chemical: Chemical hazards (toxic substances, fumes)
- ergonomic: Ergonomic hazards (poor posture, repetitive strain)
- physical: Physical hazards (noise, vibration, radiation)
- biological: Biological hazards (pathogens, contamination)

Severity levels:
- low: Minor risk, unlikely to cause serious harm
- medium: Moderate risk, could cause temporary harm
- high: Significant risk, could cause serious harm
- critical: Severe risk, could cause permanent damage or death

Return a JSON array of identified risks.`;

  const userPrompt = `Analyze this workspace description and identify occupational risks:

${description}

Return a JSON array with objects containing: type (one of: acidental, chemical, ergonomic, physical, biological), severity (low/medium/high/critical), label (short name), description (detailed explanation), and suggestedCount (estimated number of risk points for this type).`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "risks_array",
        strict: true,
        schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["acidental", "chemical", "ergonomic", "physical", "biological"],
              },
              severity: {
                type: "string",
                enum: ["low", "medium", "high", "critical"],
              },
              label: { type: "string" },
              description: { type: "string" },
              suggestedCount: { type: "integer", minimum: 1, maximum: 10 },
            },
            required: ["type", "severity", "label", "description", "suggestedCount"],
            additionalProperties: false,
          },
        },
      },
    },
  });

  const messageContent = response.choices[0]?.message.content;
  const content = typeof messageContent === 'string' ? messageContent : "[]";
  const risks = JSON.parse(content) as IdentifiedRisk[];

  return risks;
}

/**
 * Extract element descriptions from SVG for positioning hints
 */
function extractSvgElements(svg: string): string[] {
  const elements: string[] = [];
  const regex = /<text[^>]*>([^<]+)<\/text>/g;
  let match;

  while ((match = regex.exec(svg)) !== null) {
    if (match[1]) {
      elements.push(match[1]);
    }
  }

  return elements;
}

/**
 * Get color for risk type
 */
export function getRiskTypeColor(type: RiskType): string {
  const colors: Record<RiskType, string> = {
    physical: "#22C55E",      // Verde
    ergonomic: "#EAB308",     // Amarelo
    acidental: "#3B82F6",     // Azul
    biological: "#92400E",    // Marrom
    chemical: "#EF4444",      // Vermelho
  };

  return colors[type] || "#999999";
}

/**
 * Get radius based on severity
 */
export function getRadiusBySeverity(severity: Severity): number {
  const radii: Record<Severity, number> = {
    low: 20,
    medium: 30,
    high: 40,
    critical: 50,
  };

  return radii[severity] || 30;
}
