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
 * SOLUÇÃO OTIMIZADA v4 (com suporte robusto a produção):
 * 1. Captura apenas o canvas do mapa (sem legenda)
 * 2. Preserva proporções corretas do mapa
 * 3. Remove apenas propriedades CSS que contenham OKLCH
 * 4. Adiciona legenda separadamente no PDF
 * 5. Renderização em alta qualidade
 * 6. Fallback completo se captura falhar
 * 7. Suporte melhorado para ambientes de produção com CORS
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

    // Encontrar o elemento do canvas (apenas o mapa, sem legenda)
    const canvasElement = container.querySelector('.bg-white.rounded-lg.border.border-border.overflow-auto');
    if (!canvasElement) {
      throw new Error('Elemento do canvas não encontrado');
    }

    console.log('[PDF] Canvas encontrado');

    // Capturar o mapa como imagem
    let mapImage: { data: string; width: number; height: number } | null = null;
    try {
      console.log('[PDF] Tentando capturar mapa como imagem...');
      mapImage = await captureMapAsImage(canvasElement as HTMLElement);
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
    pdf.text('Data: ' + formattedDate, 10, yPosition);
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
 * ESTRATÉGIA OTIMIZADA v4 (com suporte robusto a produção):
 * 1. Clona apenas o elemento do canvas (sem legenda)
 * 2. Remove apenas propriedades CSS que contenham "oklch"
 * 3. Mantém proporções corretas do SVG
 * 4. Captura com html2canvas em alta qualidade
 * 5. Suporta ambientes de produção com configurações otimizadas
 * 6. Remove o clone
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

    // PASSO 1: Remover apenas OKLCH dos stylesheets
    console.log('[PDF] Removendo propriedades OKLCH dos stylesheets...');
    
    const allStyles = Array.from(document.querySelectorAll('style'));
    allStyles.forEach((style) => {
      if (style.textContent) {
        // Guardar conteúdo original
        originalStylesheets.push({
          element: style,
          content: style.textContent,
        });

        // Remover apenas linhas que contenham "oklch"
        const lines = style.textContent.split('\n');
        const filteredLines = lines.filter(line => !line.toLowerCase().includes('oklch'));
        style.textContent = filteredLines.join('\n');
      }
    });

    // PASSO 2: Clonar o elemento
    clonedElement = element.cloneNode(true) as HTMLElement;

    // PASSO 3: Remover OKLCH de estilos inline também
    console.log('[PDF] Removendo OKLCH de estilos inline...');
    removeOklchFromInlineStyles(clonedElement);

    // PASSO 4: Criar container temporário com dimensões corretas
    tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.padding = '0';
    tempContainer.style.margin = '0';
    tempContainer.style.border = 'none';
    
    // Preservar dimensões originais
    tempContainer.style.width = element.scrollWidth + 'px';
    tempContainer.style.height = element.scrollHeight + 'px';
    
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);

    // Aguardar um pouco para o DOM renderizar
    await new Promise(resolve => setTimeout(resolve, 200));

    console.log('[PDF] Capturando elemento com html2canvas...');

    // PASSO 5: Capturar com html2canvas
    // Configurações otimizadas para ambientes de produção
    const canvas = await html2canvas(clonedElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      windowHeight: clonedElement.scrollHeight,
      windowWidth: clonedElement.scrollWidth,
      foreignObjectRendering: false,
      ignoreElements: (element) => {
        const tag = element.tagName;
        return tag === 'SCRIPT' || tag === 'STYLE' || tag === 'META' || tag === 'LINK';
      },
      // Configurações adicionais para produção
      imageTimeout: 0, // Sem timeout para imagens
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
    // Retornar null ao invés de lançar erro para permitir fallback
    return null;
  } finally {
    // PASSO 6: Restaurar stylesheets originais
    console.log('[PDF] Restaurando stylesheets originais...');
    originalStylesheets.forEach(({ element, content }) => {
      element.textContent = content;
    });

    // PASSO 7: Limpar o clone do DOM
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
      // Remover apenas propriedades que contenham oklch
      const properties = styleText.split(';');
      const filteredProperties = properties.filter(prop => !prop.toLowerCase().includes('oklch'));
      element.style.cssText = filteredProperties.join(';');
    }
  } catch (error) {
    console.debug('[PDF] Erro ao remover OKLCH de estilos inline:', error);
  }

  // Processar filhos recursivamente
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
