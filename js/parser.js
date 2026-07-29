import { normalizeText, titleCaseBrazilian } from './utils.js';

export const COLUMNS = [
  'Nº da Proposta', 'Nº do Processo',
  'AIO - Nota DHR - Autorização para início de execução do objeto - AIO SEI nº',
  'Tomador', 'Município', 'UF', 'Valor de Repasse', 'Valor Empenhado', 'Necessidade de Empenho'
];

const cleanMoney = (value) => normalizeText(value || '').replace(/\s/g, '').replace(/^R\$\s*/i, '');
const firstMatch = (text, patterns) => {
  for (const pattern of patterns) { const match = text.match(pattern); if (match?.[1]) return normalizeText(match[1]); }
  return '';
};

function extractLocation(text) {
  const location = firstMatch(text, [
    /Munic[ií]pio\s+(?:de\s+)?([A-ZÀ-Ú][A-ZÀ-Ú\s.'-]+?)\s*\/\s*([A-Z]{2})\b/i,
    /(?:no|do)\s+Munic[ií]pio\s+de\s+([A-ZÀ-Ú][A-ZÀ-Ú\s.'-]+?)\s*\/\s*([A-Z]{2})\b/i
  ]);
  const match = text.match(/Munic[ií]pio\s+(?:de\s+)?([A-ZÀ-Ú][A-ZÀ-Ú\s.'-]+?)\s*\/\s*([A-Z]{2})\b/i)
    || text.match(/(?:no|do)\s+Munic[ií]pio\s+de\s+([A-ZÀ-Ú][A-ZÀ-Ú\s.'-]+?)\s*\/\s*([A-Z]{2})\b/i);
  return { city: match?.[1] ? titleCaseBrazilian(match[1]) : '', uf: match?.[2]?.toUpperCase() || '' };
}

// Todas as colunas e suas regras ficam centralizadas aqui: acrescente um item para criar novo campo.
export const EXTRACTION_RULES = [
  { key: 'proposal', label: COLUMNS[0], extract: text => firstMatch(text, [/Proposta\s*n[ºo°.]?\s*(\d{5,6}\/\d{4})\b/i]) },
  { key: 'process', label: COLUMNS[1], extract: text => firstMatch(text, [/PROCESSO\s*N[ºo°.]?\s*([\d.]+\/\d{4}-\d{2})/i, /Processo\s*n[ºo°.]?\s*([\d.]+\/\d{4}-\d{2})/i]) },
  { key: 'technicalNote', label: 'Nota Técnica', extract: text => firstMatch(text, [/Nota\s+T[eé]cnica\s+n?[ºo°.]?\s*([\d]+\/\d{4}\/[A-Z0-9-\/]+)/i]) },
  { key: 'sei', label: 'SEI', extract: text => firstMatch(text, [/Nota\s+T[eé]cnica\s+\d+\s*\((\d{6,9})\)/i, /c[oó]digo\s+verificador\s*(\d{6,9})/i, /SEI\s+n?[ºo°.]?\s*(\d{6,9})/i]) },
  { key: 'recipient', label: COLUMNS[3], extract: text => /MUNIC[IÍ]PIO\s+DE/i.test(text) ? 'Município' : (/ESTADO\s+DE/i.test(text) ? 'Estado' : '') },
  { key: 'city', label: COLUMNS[4], extract: text => extractLocation(text).city },
  { key: 'uf', label: COLUMNS[5], extract: text => extractLocation(text).uf },
  { key: 'transfer', label: COLUMNS[6], extract: text => cleanMoney(firstMatch(text, [/Valor\s+de\s+Repasse\s*R?\$?\s*([\d.]+,\d{2})/i])) },
  { key: 'committed', label: COLUMNS[7], extract: text => cleanMoney(firstMatch(text, [/Valor\s+Empenhado\s*R?\$?\s*([\d.]+,\d{2})/i])) },
  { key: 'needed', label: COLUMNS[8], extract: text => cleanMoney(firstMatch(text, [/Necessidade\s+de\s+Empenho\s*R?\$?\s*([\d.]+,\d{2})/i])) }
];

export function parseTechnicalNote(rawText) {
  const text = normalizeText(rawText);
  const values = Object.fromEntries(EXTRACTION_RULES.map(rule => [rule.key, rule.extract(text) || '']));
  const aio = values.technicalNote && values.sei && values.city && values.uf
    ? `Nota Técnica nº ${values.technicalNote} SEI nº (${values.sei}) Município de ${values.city}/${values.uf}` : '';
  return {
    [COLUMNS[0]]: values.proposal, [COLUMNS[1]]: values.process, [COLUMNS[2]]: aio,
    [COLUMNS[3]]: values.recipient, [COLUMNS[4]]: values.city, [COLUMNS[5]]: values.uf,
    [COLUMNS[6]]: values.transfer, [COLUMNS[7]]: values.committed, [COLUMNS[8]]: values.needed
  };
}
