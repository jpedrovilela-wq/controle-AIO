import { COLUMNS } from './parser.js';

export function exportRowsToExcel(rows) {
  if (!globalThis.XLSX) throw new Error('SheetJS não foi carregado. Verifique sua conexão e tente novamente.');
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: COLUMNS });
  worksheet['!cols'] = [16, 24, 74, 14, 24, 8, 18, 18, 22].map(wch => ({ wch }));
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    cell.s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1455A3' } }, alignment: { wrapText: true } };
  }
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Extraídas');
  XLSX.writeFile(workbook, 'Controle_AIO_FNHIS_Sub_50_Extraidas.xlsx', { compression: true });
}
