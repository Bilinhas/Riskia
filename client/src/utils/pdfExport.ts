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
 * Exporta o mapa de riscos como PDF usando canvas
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

    // Usar canvas para capturar o mapa sem problemas de OKLCH
    const canvas = await captureMapAsCanvas(element);
    
    const imgData = canvas.toDataURL('image/png');
    const imgWidth = 190; // A4 width in mm minus margins
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

      // Titulo da legenda
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
 * Captura o elemento do mapa como canvas usando drawImage
 */
async function captureMapAsCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  return new Promise((resolve, reject) => {
    // Usar requestAnimationFrame para garantir que o elemento está renderizado
    requestAnimationFrame(async () => {
      try {
        // Criar canvas com as dimensões do elemento
        const canvas = document.createElement('canvas');
        const rect = element.getBoundingClientRect();
        
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Não foi possível obter contexto 2D do canvas');
        }
        
        // Escalar para device pixel ratio
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        
        // Preencher com branco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, rect.width, rect.height);
        
        // Usar foreignObject para renderizar HTML no canvas
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', String(rect.width));
        svg.setAttribute('height', String(rect.height));
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        
        const foreignObject = document.createElementNS('http://www.w3.org/2000/svg', 'foreignObject');
        foreignObject.setAttribute('width', String(rect.width));
        foreignObject.setAttribute('height', String(rect.height));
        foreignObject.setAttribute('x', '0');
        foreignObject.setAttribute('y', '0');
        
        // Clonar elemento e remover estilos OKLCH
        const clone = element.cloneNode(true) as HTMLElement;
        removeOklchStyles(clone);
        
        foreignObject.appendChild(clone);
        svg.appendChild(foreignObject);
        
        const svgString = new XMLSerializer().serializeToString(svg);
        const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const svgUrl = URL.createObjectURL(svgBlob);
        
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(svgUrl);
          resolve(canvas);
        };
        img.onerror = () => {
          URL.revokeObjectURL(svgUrl);
          reject(new Error('Erro ao carregar imagem SVG'));
        };
        img.src = svgUrl;
      } catch (error) {
        reject(error);
      }
    });
  });
}

/**
 * Remove estilos OKLCH de um elemento recursivamente
 */
function removeOklchStyles(element: Element): void {
  // Remove atributo style se contiver oklch
  const style = element.getAttribute('style');
  if (style && style.includes('oklch')) {
    const newStyle = style.replace(/[^;]*oklch[^;]*;?/gi, '');
    if (newStyle.trim()) {
      element.setAttribute('style', newStyle);
    } else {
      element.removeAttribute('style');
    }
  }
  
  // Remove classes
  try {
    (element as HTMLElement).className = '';
  } catch (e) {
    // Ignora erro para SVG
  }
  
  // Processa filhos
  Array.from(element.children).forEach(removeOklchStyles);
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
