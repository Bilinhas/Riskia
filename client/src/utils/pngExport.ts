import html2canvas from 'html2canvas';

/**
 * Exporta o mapa de riscos como PNG
 * 
 * ESTRATÉGIA:
 * 1. Remove OKLCH de todos os stylesheets ANTES de capturar
 * 2. Clona o elemento do canvas (SVG + círculos)
 * 3. Captura com html2canvas em alta qualidade
 * 4. Restaura stylesheets originais
 * 5. Download automático do PNG
 */
export async function exportMapToPNG(
  mapContainerId: string,
  filename: string = 'mapa-risco.png'
): Promise<void> {
  let originalStylesheets: { element: HTMLStyleElement; content: string }[] = [];
  let clonedElement: HTMLElement | null = null;
  let tempContainer: HTMLElement | null = null;

  try {
    console.log('[PNG] Iniciando exportação de PNG...');

    const container = document.getElementById(mapContainerId);
    if (!container) {
      throw new Error('Elemento do mapa não encontrado');
    }

    // Encontrar o elemento do canvas (apenas o mapa, sem legenda)
    const canvasElement = container.querySelector('.bg-white.rounded-lg.border.border-border.overflow-auto');
    if (!canvasElement) {
      throw new Error('Elemento do canvas não encontrado');
    }

    console.log('[PNG] Canvas encontrado');

    // PASSO 1: Remover OKLCH de TODOS os stylesheets
    console.log('[PNG] Removendo OKLCH de todos os stylesheets...');
    
    const allStyles = Array.from(document.querySelectorAll('style'));
    allStyles.forEach((style) => {
      if (style.textContent) {
        // Guardar conteúdo original
        originalStylesheets.push({
          element: style,
          content: style.textContent,
        });

        // Remover linhas que contenham "oklch"
        const lines = style.textContent.split('\n');
        const filteredLines = lines.map(line => {
          // Remover propriedades CSS que usem oklch
          return line.replace(/[^:]*:\s*oklch\([^)]*\)[^;]*;?/gi, '');
        }).filter(line => line.trim());
        
        style.textContent = filteredLines.join('\n');
      }
    });

    // PASSO 2: Clonar o elemento
    console.log('[PNG] Clonando elemento do canvas...');
    clonedElement = canvasElement.cloneNode(true) as HTMLElement;

    // PASSO 3: Remover OKLCH de estilos inline também
    console.log('[PNG] Removendo OKLCH de estilos inline...');
    removeOklchFromInlineStyles(clonedElement);

    // PASSO 4: Criar container temporário
    tempContainer = document.createElement('div');
    tempContainer.style.position = 'fixed';
    tempContainer.style.left = '-9999px';
    tempContainer.style.top = '-9999px';
    tempContainer.style.zIndex = '-9999';
    tempContainer.style.backgroundColor = '#ffffff';
    tempContainer.style.padding = '0';
    tempContainer.style.margin = '0';
    tempContainer.style.border = 'none';
    
    // Preservar dimensões do canvas original
    tempContainer.style.width = canvasElement.scrollWidth + 'px';
    tempContainer.style.height = canvasElement.scrollHeight + 'px';
    
    tempContainer.appendChild(clonedElement);
    document.body.appendChild(tempContainer);

    // Aguardar um pouco para o DOM renderizar
    await new Promise(resolve => setTimeout(resolve, 300));

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
        const tag = element.tagName;
        return tag === 'SCRIPT' || tag === 'STYLE' || tag === 'META' || tag === 'LINK';
      },
      imageTimeout: 0,
    });

    console.log('[PNG] Canvas criado:', canvas.width, 'x', canvas.height);

    // PASSO 6: Converter para blob e fazer download
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('Falha ao criar blob do canvas');
      }

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      console.log('[PNG] PNG exportado com sucesso');
    }, 'image/png', 1);

  } catch (error) {
    console.error('[PNG] Erro ao exportar PNG:', error);
    throw error;
  } finally {
    // PASSO 7: Restaurar stylesheets originais
    console.log('[PNG] Restaurando stylesheets originais...');
    originalStylesheets.forEach(({ element, content }) => {
      element.textContent = content;
    });

    // PASSO 8: Limpar o clone do DOM
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
      styleText = styleText.replace(/[^:]*:\s*oklch\([^)]*\)[^;]*;?/gi, '');
      element.style.cssText = styleText;
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
