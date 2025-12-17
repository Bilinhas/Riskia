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
 * Remove ou substitui cores OKLCH em um elemento
 */
function sanitizeElement(element: HTMLElement): HTMLElement {
  const clone = element.cloneNode(true) as HTMLElement;
  
  // Remove todas as classes que possam conter OKLCH
  try {
    clone.className = '';
  } catch (e) {
    // SVG elements tem className read-only, ignora erro
  }
  clone.style.cssText = '';
  
  // Processa elemento e todos os filhos recursivamente
  const processElement = (el: Element) => {
    // Verifica se eh um elemento SVG
    const isSVG = el.namespaceURI === 'http://www.w3.org/2000/svg';
    
    // Remove classes apenas se nao for SVG
    if (!isSVG) {
      try {
        (el as HTMLElement).className = '';
      } catch (e) {
        // Ignora erro se nao conseguir remover classe
      }
    }
    
    // Remove atributos de estilo inline que contenham oklch
    if ((el as HTMLElement).style && (el as HTMLElement).style.cssText) {
      let cssText = (el as HTMLElement).style.cssText;
      // Remove qualquer propriedade que contenha oklch
      cssText = cssText.replace(/[^;]*oklch[^;]*;?/gi, '');
      (el as HTMLElement).style.cssText = cssText;
    }
    
    // Processa filhos
    Array.from(el.children).forEach(processElement);
  };
  
  processElement(clone);
  
  // Adiciona estilos basicos para garantir legibilidade
  clone.style.backgroundColor = '#ffffff';
  clone.style.color = '#000000';
  clone.style.fontFamily = 'Arial, sans-serif';

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
      throw new Error('Elemento do mapa nao encontrado');
    }

    // Sanitizar elemento para remover cores OKLCH
    const sanitizedElement = sanitizeElement(element);
    
    // Criar container temporario
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.appendChild(sanitizedElement);
    document.body.appendChild(tempContainer);

    try {
      // Capturar o elemento como imagem com configuracoes otimizadas
      const canvas = await html2canvas(sanitizedElement, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        ignoreElements: (element) => {
          // Ignora scripts e estilos
          return element.tagName === 'SCRIPT' || element.tagName === 'STYLE';
        },
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

      // Adicionar titulo
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

      // Adicionar descricao
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

      // Adicionar nova pagina para legenda se necessario
      if (mapData.risks.length > 0) {
        pdf.addPage();
        yPosition = 10;

        // Titulo da legenda
        pdf.setFontSize(14);
        pdf.text('Legenda de Riscos', 10, yPosition);
        yPosition += 10;

        // Adicionar cada risco na legenda
        pdf.setFontSize(10);
        mapData.risks.forEach((risk) => {
          // Desenhar circulo de cor
          const circleRadius = 3;
          const rgbColor = hexToRgb(risk.color);
          pdf.setFillColor(rgbColor.r, rgbColor.g, rgbColor.b);
          pdf.circle(15, yPosition + 1, circleRadius, 'F');

          // Adicionar informacoes do risco
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

          // Verificar se precisa de nova pagina
          if (yPosition > 270) {
            pdf.addPage();
            yPosition = 10;
          }
        });
      }

      // Salvar PDF
      pdf.save(filename);
    } finally {
      // Remover container temporario
      document.body.removeChild(tempContainer);
    }
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    // Fallback: tenta criar PDF apenas com texto
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      
      pdf.setFontSize(18);
      pdf.text(mapData.title, 10, 10);
      pdf.setFontSize(10);
      pdf.text(`Data: ${new Date(mapData.createdAt).toLocaleDateString('pt-BR')}`, 10, 20);
      
      if (mapData.description) {
        const lines = pdf.splitTextToSize(mapData.description, 190);
        pdf.text(lines, 10, 30);
      }
      
      pdf.save(filename);
      return;
    } catch (fallbackError) {
      console.error('Erro ao exportar PDF (fallback):', fallbackError);
      throw error;
    }
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
