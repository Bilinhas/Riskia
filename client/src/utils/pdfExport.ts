import jsPDF from 'jspdf';

interface Risk {
  id: number;
  type: string;
  severity: string;
  label: string;
  description: string;
  xPosition: number;
  yPosition: number;
  radius: number;
  color: string;
}

interface MapData {
  title: string;
  description: string;
  createdAt: Date;
  risks: Risk[];
}

/**
 * Exporta o mapa de riscos como PDF
 */
export async function exportMapToPDF(
  mapContainerId: string,
  mapData: MapData,
  filename: string = 'mapa-risco.pdf'
): Promise<void> {
  try {
    const element = document.getElementById(mapContainerId);
    if (!element) {
      throw new Error('Elemento do mapa não encontrado');
    }

    // Criar PDF com jsPDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    let yPosition = 10;

    // Adicionar titulo
    pdf.setFontSize(18);
    pdf.setTextColor(0);
    pdf.text(mapData.title, 10, yPosition);
    yPosition += 10;

    // Adicionar data
    pdf.setFontSize(10);
    pdf.setTextColor(100);
    const formattedDate = new Date(mapData.createdAt).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    pdf.text(`Data: ${formattedDate}`, 10, yPosition);
    yPosition += 8;

    // Adicionar descrição
    if (mapData.description) {
      pdf.setFontSize(10);
      pdf.setTextColor(0);
      const descriptionLines = pdf.splitTextToSize(mapData.description, 190);
      pdf.text(descriptionLines, 10, yPosition);
      yPosition += descriptionLines.length * 5 + 5;
    }

    // Adicionar seção de mapa (apenas texto indicando que há um mapa visual)
    pdf.setFontSize(11);
    pdf.setTextColor(50);
    pdf.text('[Visualização do Mapa - Consulte o navegador para visualizar a planta baixa com riscos]', 10, yPosition);
    yPosition += 10;

    // Adicionar nova página para legenda
    if (mapData.risks.length > 0) {
      pdf.addPage();
      yPosition = 10;

      // Titulo da legenda
      pdf.setFontSize(14);
      pdf.setTextColor(0);
      pdf.text('Legenda de Riscos', 10, yPosition);
      yPosition += 10;

      // Adicionar cada risco na legenda
      pdf.setFontSize(10);
      mapData.risks.forEach((risk) => {
        // Desenhar círculo de cor
        const circleRadius = 3;
        const rgbColor = hexToRgb(risk.color);
        pdf.setFillColor(rgbColor.r, rgbColor.g, rgbColor.b);
        pdf.circle(15, yPosition + 1, circleRadius, 'F');

        // Adicionar informações do risco
        pdf.setTextColor(0);
        pdf.text(`${risk.label}`, 22, yPosition);
        yPosition += 5;

        pdf.setFontSize(9);
        pdf.setTextColor(100);
        pdf.text(`Tipo: ${risk.type} | Gravidade: ${risk.severity}`, 22, yPosition);
        yPosition += 4;

        if (risk.description) {
          const descLines = pdf.splitTextToSize(risk.description, 170);
          pdf.text(descLines, 22, yPosition);
          yPosition += descLines.length * 3 + 2;
        }

        yPosition += 2;
        pdf.setFontSize(10);

        // Verificar se precisa de nova página
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 10;
        }
      });
    }

    // Salvar PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    throw error;
  }
}

/**
 * Converte cor hexadecimal para RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}
