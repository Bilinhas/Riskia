/**
 * Exporta o mapa de riscos como PNG
 * 
 * Estratégia:
 * 1. Captura o elemento do mapa usando html2canvas
 * 2. Remove propriedades OKLCH do Tailwind CSS 4
 * 3. Converte para PNG e faz download
 */
export async function exportMapToPNG(
  mapContainerId: string,
  filename: string = 'mapa-risco.png'
): Promise<void> {
  try {
    const container = document.getElementById(mapContainerId);
    if (!container) {
      throw new Error('Elemento do mapa não encontrado');
    }

    console.log('[PNG] Iniciando exportação de PNG...');

    // Encontrar o elemento do canvas (apenas o mapa, sem legenda)
    const canvasElement = container.querySelector('.bg-white.rounded-lg.border.border-border.overflow-auto');
    if (!canvasElement) {
      throw new Error('Elemento do canvas não encontrado');
    }

    console.log('[PNG] Canvas encontrado');

    // Capturar o mapa como imagem
    const pngData = await captureMapAsPNG(canvasElement as HTMLElement);
    if (!pngData) {
      throw new Error('Falha ao capturar mapa como PNG');
    }

    console.log('[PNG] Mapa capturado com sucesso');

    // Criar link para download
    const link = document.createElement('a');
    link.href = pngData;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    console.log('[PNG] PNG exportado com sucesso');
  } catch (error) {
    console.error('[PNG] Erro ao exportar PNG:', error);
    throw error;
  }
}

/**
 * Captura o mapa como imagem PNG
 */
async function captureMapAsPNG(
  element: HTMLElement
): Promise<string | null> {
  let clonedElement: HTMLElement | null = null;
  let tempContainer: HTMLElement | null = null;
  const originalStylesheets: { element: HTMLStyleElement; content: string }[] = [];

  try {
    console.log('[PNG] Importando html2canvas...');
    const { default: html2canvas } = await import('html2canvas');

    console.log('[PNG] Elemento a capturar:', element);
    console.log('[PNG] Dimensões do elemento:', element.scrollWidth, 'x', element.scrollHeight);

    // PASSO 1: Remover apenas OKLCH dos stylesheets
    console.log('[PNG] Removendo propriedades OKLCH dos stylesheets...');
    
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
    console.log('[PNG] Removendo OKLCH de estilos inline...');
    removeOklchFromInlineStyles(clonedElement);

    // PASSO 4: Criar container temporário com dimensões corretas
    tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.backgroundColor = '#ffffff';
    
    // Preservar dimensões originais
    tempContainer.style.width = element.scrollWidth + 'px';
    tempContainer.style.height = element.scrollHeight + 'px';
    
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);

    // Aguardar um pouco para o DOM renderizar
    await new Promise(resolve => setTimeout(resolve, 100));

    console.log('[PNG] Capturando elemento com html2canvas...');

    // PASSO 5: Capturar com html2canvas
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
        return element.tagName === 'SCRIPT' || element.tagName === 'STYLE';
      },
    });

    console.log('[PNG] Canvas criado:', canvas.width, 'x', canvas.height);

    const imgData = canvas.toDataURL('image/png');
    console.log('[PNG] Imagem convertida para data URL, tamanho:', imgData.length);

    return imgData;
  } catch (error) {
    console.error('[PNG] Erro ao capturar mapa como imagem:', error);
    return null;
  } finally {
    // PASSO 6: Restaurar stylesheets originais
    console.log('[PNG] Restaurando stylesheets originais...');
    originalStylesheets.forEach(({ element, content }) => {
      element.textContent = content;
    });

    // PASSO 7: Limpar o clone do DOM
    if (tempContainer && tempContainer.parentElement) {
      try {
        tempContainer.parentElement.removeChild(tempContainer);
      } catch (e) {
        console.debug('[PNG] Erro ao remover container temporário:', e);
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
    console.debug('[PNG] Erro ao remover OKLCH de estilos inline:', error);
  }

  // Processar filhos recursivamente
  try {
    Array.from(element.children).forEach((child) => {
      removeOklchFromInlineStyles(child as HTMLElement | SVGElement);
    });
  } catch (error) {
    console.debug('[PNG] Erro ao processar filhos:', error);
  }
}
