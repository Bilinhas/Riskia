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

    console.log('Iniciando exportação de PDF...');

    // Capturar o mapa como imagem
    let mapImage: { data: string; width: number; height: number } | null = null;
    try {
      console.log('Tentando capturar mapa como imagem...');
      mapImage = await captureMapAsImage(element);
      if (mapImage) {
        console.log('Mapa capturado com sucesso:', mapImage.width, 'x', mapImage.height);
      } else {
        console.warn('Captura de mapa retornou null');
      }
    } catch (captureError) {
      console.error('Erro ao capturar mapa:', captureError);
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

    // Adicionar imagem do mapa se disponível
    if (mapImage && mapImage.data) {
      try {
        console.log('Adicionando imagem ao PDF...');
        const imgWidth = 190;
        const imgHeight = (mapImage.height * imgWidth) / mapImage.width;
        const maxImgHeight = 270 - yPosition;

        let finalImgHeight = imgHeight;
        if (finalImgHeight > maxImgHeight) {
          finalImgHeight = maxImgHeight;
        }

        const finalImgWidth = (finalImgHeight * mapImage.width) / mapImage.height;
        const xPosition = (210 - finalImgWidth) / 2;

        pdf.addImage(mapImage.data, 'PNG', xPosition, yPosition, finalImgWidth, finalImgHeight);
        yPosition += finalImgHeight + 10;
        console.log('Imagem adicionada com sucesso');
      } catch (imgError) {
        console.error('Erro ao adicionar imagem ao PDF:', imgError);
        // Continuar sem imagem
      }
    } else {
      console.warn('Nenhuma imagem disponível para adicionar ao PDF');
    }

    // Adicionar nova página para legenda se necessário
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
    console.log('Salvando PDF...');
    pdf.save(filename);
    console.log('PDF salvo com sucesso');
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    throw error;
  }
}

/**
 * Captura o mapa como imagem PNG
 */
async function captureMapAsImage(
  element: HTMLElement
): Promise<{ data: string; width: number; height: number } | null> {
  try {
    console.log('Importando html2canvas...');
    const { default: html2canvas } = await import('html2canvas');

    // Clonar elemento e remover classes Tailwind
    const clonedElement = element.cloneNode(true) as HTMLElement;
    removeAllClasses(clonedElement);
    
    // Remover atributos style que possam conter OKLCH
    removeOklchStyles(clonedElement);

    console.log('Elemento a capturar:', clonedElement);
    console.log('Dimensões do elemento:', clonedElement.scrollWidth, 'x', clonedElement.scrollHeight);

    const canvas = await html2canvas(clonedElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: false,
      allowTaint: true,
      logging: true,
      windowHeight: clonedElement.scrollHeight,
      windowWidth: clonedElement.scrollWidth,
    });

    console.log('Canvas criado:', canvas.width, 'x', canvas.height);

    const imgData = canvas.toDataURL('image/png');
    console.log('Imagem convertida para data URL, tamanho:', imgData.length);

    return {
      data: imgData,
      width: canvas.width,
      height: canvas.height,
    };
  } catch (error) {
    console.error('Erro ao capturar mapa como imagem:', error);
    return null;
  }
}

/**
 * Remove todas as classes de um elemento e seus filhos
 */
function removeAllClasses(element: HTMLElement): void {
  element.removeAttribute('class');
  element.removeAttribute('style');
  
  const children = element.querySelectorAll('*');
  children.forEach((child) => {
    (child as HTMLElement).removeAttribute('class');
    (child as HTMLElement).removeAttribute('style');
  });
}

/**
 * Remove estilos OKLCH de um elemento e seus filhos
 */
function removeOklchStyles(element: HTMLElement): void {
  const removeOklchFromElement = (el: HTMLElement) => {
    const style = el.getAttribute('style');
    if (style && style.includes('oklch')) {
      el.removeAttribute('style');
    }
  };

  removeOklchFromElement(element);
  const children = element.querySelectorAll('*');
  children.forEach((child) => {
    removeOklchFromElement(child as HTMLElement);
  });
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
