import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

export async function extractPdfText(file) {
  const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = await Promise.all(Array.from({ length: pdf.numPages }, async (_, index) => {
    const content = await (await pdf.getPage(index + 1)).getTextContent();
    // O PDF do "Imprimir Web" entrega cada trecho da tabela separadamente.
    // Reconstituir as linhas pela coordenada vertical preserva o Município
    // Beneficiado e evita juntar rótulo, cidade e UF em um texto ambíguo.
    const lines = [];
    for (const item of content.items) {
      const y = item.transform[5];
      let line = lines.find(candidate => Math.abs(candidate.y - y) <= 2);
      if (!line) {
        line = { y, items: [] };
        lines.push(line);
      }
      line.items.push({ x: item.transform[4], text: item.str });
    }
    return lines
      .sort((first, second) => second.y - first.y)
      .map(line => line.items.sort((first, second) => first.x - second.x).map(item => item.text).join(' '))
      .join('\n');
  }));
  return pages.join('\n');
}
