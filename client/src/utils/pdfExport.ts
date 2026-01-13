import jsPDF from 'jspdf';

interface Risk {
  id: number;
  type: string;
  severity: string;
  label: string;
  description: string | null;
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
 * ESTRATÉGIA CORRIGIDA:
 * 1. Captura o svgContainerRef (que contém SVG + riscos)
 * 2. Remove transformações de zoom/pan para captura limpa
 * 3. Garante que riscos sejam renderizados antes de capturar
 * 4. Usa html2canvas com configurações otimizadas
 * 5. Adiciona legenda em página separada
 */
export async function exportMapToPDF(
  mapContainerId: string,
  mapData: MapData,
  filename: string = 'mapa-risco.pdf'
): Promise<void> {
  try {
    const container = document.getElementById(mapContainerId);
    if (!container) {
      throw new Error('Elemento do mapa não encontrado');
    }

    console.log('[PDF] Iniciando exportação de PDF...');

    // Encontrar o svgContainerRef que contém SVG + riscos
    // Procurar por elemento que tem data-riskmap-svg dentro
    const svgElement = container.querySelector('[data-riskmap-svg]');
    if (!svgElement) {
      throw new Error('SVG do mapa não encontrado');
    }

    // Subir até encontrar o svgContainerRef (que tem as transformações)
    let svgContainer = svgElement.parentElement;
    while (svgContainer && !svgContainer.querySelector('[data-riskmap-svg]')) {
      svgContainer = svgContainer.parentElement;
    }

    if (!svgContainer) {
      throw new Error('Container do SVG não encontrado');
    }

    console.log('[PDF] Container encontrado');

    // Capturar o mapa como imagem
    let mapImage: { data: string; width: number; height: number } | null = null;
    try {
      console.log('[PDF] Tentando capturar mapa como imagem...');
      mapImage = await captureMapAsImage(svgContainer as HTMLElement);
      if (mapImage) {
        console.log('[PDF] Mapa capturado com sucesso:', mapImage.width, 'x', mapImage.height);
      } else {
        console.warn('[PDF] Captura de mapa retornou null, continuando com legenda apenas');
      }
    } catch (captureError) {
      console.error('[PDF] Erro ao capturar mapa como imagem:', captureError);
      console.warn('[PDF] Continuando com PDF apenas com legenda');
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
        console.log('[PDF] Adicionando imagem ao PDF...');
        
        // Calcular dimensões mantendo proporção
        const pageWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const margin = 10;
        const maxWidth = pageWidth - 2 * margin;
        const maxHeight = pageHeight - yPosition - margin;

        // Calcular escala mantendo aspect ratio
        const imgAspectRatio = mapImage.width / mapImage.height;
        let imgWidth = maxWidth;
        let imgHeight = imgWidth / imgAspectRatio;

        // Se altura exceder, reduzir largura
        if (imgHeight > maxHeight) {
          imgHeight = maxHeight;
          imgWidth = imgHeight * imgAspectRatio;
        }

        // Centralizar horizontalmente
        const xPosition = (pageWidth - imgWidth) / 2;

        console.log('[PDF] Dimensões finais: ' + imgWidth + 'mm x ' + imgHeight + 'mm');
        pdf.addImage(mapImage.data, 'PNG', xPosition, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + 10;
        console.log('[PDF] Imagem adicionada com sucesso');
      } catch (imgError) {
        console.error('[PDF] Erro ao adicionar imagem ao PDF:', imgError);
      }
    } else {
      console.warn('[PDF] Nenhuma imagem disponível para adicionar ao PDF');
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
        pdf.text(risk.label, 22, yPosition);
        yPosition += 5;

        pdf.setFontSize(9);
        pdf.setTextColor(100);
        pdf.text('Tipo: ' + risk.type + ' | Gravidade: ' + risk.severity, 22, yPosition);
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
    console.log('[PDF] Salvando PDF...');
    pdf.save(filename);
    console.log('[PDF] PDF salvo com sucesso');
  } catch (error) {
    console.error('[PDF] Erro ao exportar PDF:', error);
    throw error;
  }
}

/**
 * Captura o mapa como imagem PNG
 * 
 * ESTRATÉGIA CORRIGIDA:
 * 1. Clona o svgContainer (que contém SVG + riscos)
 * 2. Remove transformações de zoom/pan do clone
 * 3. Remove OKLCH dos stylesheets
 * 4. Captura com html2canvas
 * 5. Restaura stylesheets originais
 */
async function captureMapAsImage(
  element: HTMLElement
): Promise<{ data: string; width: number; height: number } | null> {
  let clonedElement: HTMLElement | null = null;
  let tempContainer: HTMLElement | null = null;
  const originalStylesheets: { element: HTMLStyleElement; content: string }[] = [];

  try {
    console.log('[PDF] Importando html2canvas...');
    const { default: html2canvas } = await import('html2canvas');

    console.log('[PDF] Elemento a capturar:', element);
    console.log('[PDF] Dimensões do elemento:', element.scrollWidth, 'x', element.scrollHeight);

    // PASSO 1: Remover OKLCH dos stylesheets
    console.log('[PDF] Removendo propriedades OKLCH dos stylesheets...');
    
    const allStyles = Array.from(document.querySelectorAll('style'));
    allStyles.forEach((style) => {
      if (style.textContent) {
        originalStylesheets.push({
          element: style,
          content: style.textContent,
        });
        const lines = style.textContent.split('\n');
        const filteredLines = lines.filter(line => !line.toLowerCase().includes('oklch'));
        style.textContent = filteredLines.join('\n');
      }
    });

    // PASSO 2: Clonar o elemento
    clonedElement = element.cloneNode(true) as HTMLElement;

    // PASSO 3: Remover transformações de zoom/pan do clone
    console.log('[PDF] Removendo transformações de zoom/pan...');
    clonedElement.style.transform = 'none';
    clonedElement.style.transformOrigin = 'unset';

    // PASSO 4: Remover OKLCH de estilos inline também
    console.log('[PDF] Removendo OKLCH de estilos inline...');
    removeOklchFromInlineStyles(clonedElement);

    // PASSO 5: Calcular dimensões do SVG dentro do clone
    const svgInClone = clonedElement.querySelector('[data-riskmap-svg]');
    let captureWidth = element.scrollWidth;
    let captureHeight = element.scrollHeight;

    if (svgInClone) {
      const svgRect = svgInClone.getBoundingClientRect();
      captureWidth = Math.max(svgRect.width, 800);
      captureHeight = Math.max(svgRect.height, 600);
      console.log('[PDF] Dimensões do SVG: ' + captureWidth + ' x ' + captureHeight);
    }

    // PASSO 6: Criar container temporário
    tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.width = captureWidth + 'px';
    tempContainer.style.height = captureHeight + 'px';
    
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);

    // Aguardar renderização
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('[PDF] Capturando elemento com html2canvas...');

    // PASSO 7: Capturar com html2canvas
    const canvas = await html2canvas(clonedElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowHeight: captureHeight,
      windowWidth: captureWidth,
      foreignObjectRendering: false,
    });

    console.log('[PDF] Canvas criado:', canvas.width, 'x', canvas.height);

    const imgData = canvas.toDataURL('image/png');
    console.log('[PDF] Imagem convertida para data URL, tamanho:', imgData.length);

    return {
      data: imgData,
      width: canvas.width,
      height: canvas.height,
    };
  } catch (error) {
    console.error('[PDF] Erro ao capturar mapa como imagem:', error);
    return null;
  } finally {
    // PASSO 8: Restaurar stylesheets originais
    console.log('[PDF] Restaurando stylesheets originais...');
    originalStylesheets.forEach(({ element, content }) => {
      element.textContent = content;
    });

    // PASSO 9: Limpar o clone do DOM
    if (tempContainer && tempContainer.parentElement) {
      try {
        tempContainer.parentElement.removeChild(tempContainer);
      } catch (e) {
        console.debug('[PDF] Erro ao remover container temporário:', e);
      }
    }
  }
}

/**
 * Remove propriedades OKLCH de estilos inline
 */
function removeOklchFromInlineStyles(element: HTMLElement | SVGElement): void {
  try {
    if (element.style && element.style.cssText) {
      let styleText = element.style.cssText;
      const properties = styleText.split(';');
      const filteredProperties = properties.filter(prop => !prop.toLowerCase().includes('oklch'));
      element.style.cssText = filteredProperties.join(';');
    }
  } catch (error) {
    console.debug('[PDF] Erro ao remover OKLCH de estilos inline:', error);
  }

  try {
    Array.from(element.children).forEach((child) => {
      removeOklchFromInlineStyles(child as HTMLElement | SVGElement);
    });
  } catch (error) {
    console.debug('[PDF] Erro ao processar filhos:', error);
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
