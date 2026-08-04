import { COLUMNS } from './parser.js';

const MONEY_COLUMNS = new Set(['Valor de Repasse', 'Valor Empenhado', 'Necessidade de Empenho']);

const moneyToNumber = value => {
  const normalized = String(value ?? '').trim().replace(/\./g, '').replace(',', '.');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
};

export function exportRowsToExcel(rows, errors = []) {
  if (!globalThis.XLSX) throw new Error('SheetJS não foi carregado. Verifique sua conexão e tente novamente.');
  const worksheet = XLSX.utils.json_to_sheet(rows, { header: COLUMNS });
  worksheet['!cols'] = [16, 24, 74, 14, 24, 8, 18, 18, 22].map(wch => ({ wch }));
  const range = XLSX.utils.decode_range(worksheet['!ref']);
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: col })];
    cell.s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1455A3' } }, alignment: { wrapText: true } };
  }
  // A extração mantém valores como texto normalizado (ex.: 2800000,00). No
  // arquivo final eles são números reais, com formato monetário, para permitir
  // soma, filtros numéricos e fórmulas no Excel.
  COLUMNS.forEach((column, col) => {
    if (!MONEY_COLUMNS.has(column)) return;
    for (let row = 1; row <= range.e.r; row++) {
      const cell = worksheet[XLSX.utils.encode_cell({ r: row, c: col })];
      if (!cell) continue;
      const value = moneyToNumber(cell.v);
      if (value === null) continue;
      cell.t = 'n';
      cell.v = value;
      cell.z = 'R$ #,##0.00';
    }
  });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Extraídas');
  if (errors.length) {
    const headers = ['Nº da Nota Técnica', 'Nº do Processo', 'Nº da Proposta', 'Tipo da Verificação', 'Descrição do Erro'];
    const errorSheet = XLSX.utils.json_to_sheet(errors, { header: headers });
    errorSheet['!cols'] = [18, 25, 16, 22, 78].map(wch => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, errorSheet, 'ERROS NA NOTA TÉCNICA');
  }
  XLSX.writeFile(workbook, 'Controle_AIO_FNHIS_Sub_50_Extraidas.xlsx', { compression: true });
}
