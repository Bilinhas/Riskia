import html2canvas from 'html2canvas';

/**
 * Exporta o mapa de riscos como PNG
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

    console.log('[PNG] Iniciando exportação...');

    // Encontrar o elemento do canvas que contém SVG e riscos
    let canvasElement: HTMLElement | null = null;
    const svgElement = container.querySelector('[data-riskmap-svg]');
    if (svgElement?.parentElement?.parentElement?.parentElement) {
      canvasElement = svgElement.parentElement.parentElement.parentElement as HTMLElement;
    }
    if (!canvasElement) {
      canvasElement = container.querySelector('.relative.w-full.bg-white') as HTMLElement;
    }
    if (!canvasElement) {
      throw new Error('Elemento do canvas não encontrado');
    }

    console.log('[PNG] Canvas encontrado');

    // Remover OKLCH dos stylesheets antes de capturar
    const originalStylesheets: { element: HTMLStyleElement; content: string }[] = [];
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

    try {
      console.log('[PNG] Capturando mapa com html2canvas...');
      
      const canvas = await html2canvas(canvasElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        windowHeight: canvasElement.scrollHeight,
        windowWidth: canvasElement.scrollWidth,
      });

      console.log('[PNG] Canvas criado com sucesso');

      // Converter para blob e fazer download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Falha ao criar blob');
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
      }, 'image/png');

    } finally {
      // Restaurar stylesheets originais
      originalStylesheets.forEach(({ element, content }) => {
        element.textContent = content;
      });
    }

  } catch (error) {
    console.error('[PNG] Erro ao exportar PNG:', error);
    throw error;
  }
}
