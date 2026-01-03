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
 * 
 * SOLUÇÃO DEFINITIVA PARA OKLCH:
 * 1. Desabilita TODOS os stylesheets
 * 2. Clona o elemento
 * 3. Remove todas as classes e atributos style
 * 4. Reaplica apenas estilos RGB inline
 * 5. Captura com html2canvas
 * 6. Reabilita stylesheets
 * 7. Gera PDF
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
      console.error('Erro ao capturar mapa como imagem:', captureError);
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
 * 
 * ESTRATÉGIA DEFINITIVA:
 * 1. Desabilita TODOS os stylesheets (CSS)
 * 2. Clona o elemento
 * 3. Remove TODAS as classes e atributos style
 * 4. Reaplica apenas estilos RGB inline necessários
 * 5. Captura com html2canvas
 * 6. Reabilita stylesheets
 * 7. Remove o clone
 */
async function captureMapAsImage(
  element: HTMLElement
): Promise<{ data: string; width: number; height: number } | null> {
  let clonedElement: HTMLElement | null = null;
  let tempContainer: HTMLElement | null = null;
  const disabledStylesheets: HTMLStyleElement[] = [];
  const disabledLinks: HTMLLinkElement[] = [];

  try {
    console.log('Importando html2canvas...');
    const { default: html2canvas } = await import('html2canvas');

    console.log('Elemento a capturar:', element);
    console.log('Dimensões do elemento:', element.scrollWidth, 'x', element.scrollHeight);

    // PASSO 1: Desabilitar TODOS os stylesheets
    console.log('Desabilitando stylesheets...');
    
    // Desabilitar todas as tags <style>
    const allStyles = Array.from(document.querySelectorAll('style'));
    allStyles.forEach((style) => {
      style.disabled = true;
      disabledStylesheets.push(style);
    });

    // Desabilitar todos os <link rel="stylesheet">
    const allLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'));
    allLinks.forEach((link) => {
      (link as HTMLLinkElement).disabled = true;
      disabledLinks.push(link as HTMLLinkElement);
    });

    // PASSO 2: Clonar o elemento
    clonedElement = element.cloneNode(true) as HTMLElement;

    // PASSO 3: Remover TODAS as classes e estilos
    console.log('Removendo classes e estilos...');
    stripAllStyles(clonedElement);

    // PASSO 4: Criar container temporário
    tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.zIndex = '-9999';
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);

    // Aguardar um pouco para o DOM renderizar
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('Capturando elemento com html2canvas...');

    // PASSO 5: Capturar com html2canvas
    const canvas = await html2canvas(clonedElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: false,
      allowTaint: true,
      logging: false,
      windowHeight: clonedElement.scrollHeight,
      windowWidth: clonedElement.scrollWidth,
      foreignObjectRendering: false,
      ignoreElements: (element) => {
        return element.tagName === 'SCRIPT' || element.tagName === 'STYLE';
      },
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
  } finally {
    // PASSO 6: Reabilitar stylesheets
    console.log('Reabilitando stylesheets...');
    disabledStylesheets.forEach((style) => {
      style.disabled = false;
    });
    disabledLinks.forEach((link) => {
      link.disabled = false;
    });

    // PASSO 7: Limpar o clone do DOM
    if (tempContainer && tempContainer.parentElement) {
      tempContainer.parentElement.removeChild(tempContainer);
    }
  }
}

/**
 * Remove TODOS os estilos de um elemento recursivamente
 */
function stripAllStyles(element: HTMLElement | SVGElement): void {
  try {
    // Remover todas as classes
    if (element.hasAttribute('class')) {
      element.removeAttribute('class');
    }

    // Remover todos os atributos style
    if (element.hasAttribute('style')) {
      element.removeAttribute('style');
    }

    // Reaplica apenas estilos básicos para layout
    const tagName = element.tagName?.toLowerCase();
    
    if (tagName === 'circle' || tagName === 'rect' || tagName === 'path' || tagName === 'polygon') {
      // Para SVG, manter fill/stroke originais
      const fill = element.getAttribute('fill');
      const stroke = element.getAttribute('stroke');
      
      if (!fill && !stroke) {
        element.setAttribute('fill', '#000000');
      }
    } else if (tagName === 'text' || tagName === 'tspan') {
      // Para texto, manter legível
      element.setAttribute('fill', '#000000');
    }
  } catch (error) {
    console.debug('Erro ao remover estilos:', error);
  }

  // Processar filhos recursivamente
  try {
    Array.from(element.children).forEach((child) => {
      stripAllStyles(child as HTMLElement | SVGElement);
    });
  } catch (error) {
    console.debug('Erro ao processar filhos:', error);
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
