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

    // Encontrar o elemento do canvas
    const canvasElement = container.querySelector('.bg-white.rounded-lg.border.border-border');
    if (!canvasElement) {
      throw new Error('Elemento do canvas não encontrado');
    }

    // Capturar com html2canvas
    const canvas = await html2canvas(canvasElement as HTMLElement, {
      backgroundColor: '#ffffff',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
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

  } catch (error) {
    console.error('[PNG] Erro ao exportar PNG:', error);
    throw error;
  }
}
