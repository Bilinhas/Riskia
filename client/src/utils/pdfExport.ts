import html2canvas from 'html2canvas';
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
 * Converte cores OKLCH para RGB (suportadas pelo html2canvas)
 */
function convertOklchToRgb(oklchColor: string): string {
  // Se não for OKLCH, retorna a cor original
  if (!oklchColor.includes('oklch')) {
    return oklchColor;
  }

  // Extrai valores OKLCH
  const match = oklchColor.match(/oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)\)/);
  if (!match) {
    return '#ffffff'; // Fallback para branco
  }

  const L = parseFloat(match[1]);
  const C = parseFloat(match[2]);
  const H = parseFloat(match[3]);

  // Converte OKLCH para RGB (implementação simplificada)
  // Para cores de fundo, usa tons neutros
  const brightness = Math.round(L * 255);
  return `rgb(${brightness}, ${brightness}, ${brightness})`;
}

/**
 * Remove ou substitui cores OKLCH em um elemento
 */
function sanitizeElement(element: HTMLElement): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement;
  const style = window.getComputedStyle(clone);
  
  // Substitui cores OKLCH por RGB
  if (style.backgroundColor && style.backgroundColor.includes('oklch')) {
    clone.style.backgroundColor = convertOklchToRgb(style.backgroundColor);
  }
  if (style.color && style.color.includes('oklch')) {
    clone.style.color = convertOklchToRgb(style.color);
  }

  // Processa elementos filhos
  clone.querySelectorAll('*').forEach((child) => {
    const childStyle = window.getComputedStyle(child as HTMLElement);
    if (childStyle.backgroundColor && childStyle.backgroundColor.includes('oklch')) {
      (child as HTMLElement).style.backgroundColor = convertOklchToRgb(childStyle.backgroundColor);
    }
    if (childStyle.color && childStyle.color.includes('oklch')) {
      (child as HTMLElement).style.color = convertOklchToRgb(childStyle.color);
    }
  });

  return clone;
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

    // Sanitizar elemento para remover cores OKLCH
    const sanitizedElement = sanitizeElement(element);
    
    // Criar container temporário
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.appendChild(sanitizedElement);
    document.body.appendChild(tempContainer);

    try {
      // Capturar o elemento como imagem
      const canvas = await html2canvas(sanitizedElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // Criar PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      let yPosition = 10;

      // Adicionar título
      pdf.setFontSize(18);
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

      // Adicionar imagem do mapa
      const maxImgHeight = 270 - yPosition;
      let finalImgHeight = imgHeight;

      if (finalImgHeight > maxImgHeight) {
        finalImgHeight = maxImgHeight;
      }

      const finalImgWidth = (finalImgHeight * imgWidth) / imgHeight;
      const xPosition = (210 - finalImgWidth) / 2;

      pdf.addImage(imgData, 'PNG', xPosition, yPosition, finalImgWidth, finalImgHeight);
      yPosition += finalImgHeight + 10;

      // Adicionar nova página para legenda se necessário
      if (mapData.risks.length > 0) {
        pdf.addPage();
        yPosition = 10;

        // Título da legenda
        pdf.setFontSize(14);
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
    } finally {
      // Remover container temporário
      document.body.removeChild(tempContainer);
    }
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
