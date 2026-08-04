import { normalizeText, titleCaseBrazilian } from './utils.js';

export const COLUMNS = [
  'Nº da Proposta', 'Nº do Processo',
  'AIO - Nota DHR - Autorização para início de execução do objeto - AIO SEI nº',
  'Tomador', 'Município', 'UF', 'Valor de Repasse', 'Valor Empenhado', 'Necessidade de Empenho'
];

/**
 * Padroniza moedas para o formato textual exigido pela planilha: 3250000,00.
 * Os pontos de milhar são removidos e uma casa decimal faltante é preenchida com zero.
 */
const cleanMoney = (value) => {
  const source = normalizeText(value || '').replace(/^R\$\s*/i, '').replace(/\s/g, '');
  if (!source) return '';
  const [integerPart = '', decimalPart = ''] = source.split(',');
  const integer = integerPart.replace(/\D/g, '');
  const decimals = decimalPart.replace(/\D/g, '').padEnd(2, '0').slice(0, 2);
  return integer ? `${integer},${decimals}` : '';
};
const firstMatch = (text, patterns) => {
  for (const pattern of patterns) { const match = text.match(pattern); if (match?.[1]) return normalizeText(match[1]); }
  return '';
};

function extractLocation(text) {
  // O espaço da cidade não inclui quebras de linha. Isso impede que a tabela
  // impressa (rótulo e valor em linhas separadas) forme um município duplicado.
  const city = "[A-ZÀ-Ú][A-ZÀ-Ú .'-]*?";
  const match = text.match(new RegExp(`Munic[ií]pio\\s+(?:de\\s+)?(${city})\\s*\\/\\s*([A-Z]{2})\\b`, 'i'))
    || text.match(new RegExp(`(?:no|do)\\s+Munic[ií]pio\\s+de\\s+(${city})\\s*\\/\\s*([A-Z]{2})\\b`, 'i'));
  return { city: match?.[1] ? titleCaseBrazilian(match[1]) : '', uf: match?.[2]?.toUpperCase() || '' };
}

// Chave de comparação independente de caixa, acentos, espaços e pontuação.
// Ex.: “São Paulo”, “SÃO PAULO” e “Sao-Paulo” resultam em “SAOPAULO”.
const normalizeComparable = (value = '') => normalizeText(value)
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]/gi, '')
  .toLocaleUpperCase('pt-BR');
const toCents = value => {
  const [integer = '0', decimals = '0'] = cleanMoney(value).split(',');
  return Number(integer || 0) * 100 + Number(decimals.padEnd(2, '0').slice(0, 2) || 0);
};
const extractSection = (text, section, nextSection) => {
  const marker = section.replace('.', '\\s*\\.\\s*');
  const next = nextSection.replace('.', '\\s*\\.\\s*');
  return text.match(new RegExp(`(?:^|\\s)${marker}\\s*\\.\\s*(.*?)(?=\\s*${next}\\s*\\.|$)`, 'is'))?.[1] || '';
};
const extractAmount = (text, patterns) => cleanMoney(firstMatch(text, patterns));
const extractQuadroValues = quadro => ({
  transfer: extractAmount(quadro, [/Valor\s+de\s+Repasse\s*R?\$?\s*([\d.]+,\d{1,2})/i]),
  committed: extractAmount(quadro, [/Valor\s+Empenhado\s*R?\$?\s*([\d.]+,\d{1,2})/i]),
  needed: extractAmount(quadro, [/Necessidade\s+de\s+Empenho\s*R?\$?\s*([\d.]+,\d{1,2})/i])
});

const extractQuadroLocation = rawQuadro => {
  const labelled = rawQuadro.match(/Munic[ií]pio\s+Beneficiado[ \t]+Munic[ií]pio\s+de\s+([A-ZÀ-Ú][A-ZÀ-Ú .'-]*?)\s*\/\s*([A-Z]{2})\b/i);
  if (labelled?.[1]) return { city: titleCaseBrazilian(labelled[1]), uf: labelled[2].toUpperCase() };

  const lines = rawQuadro.split(/\r?\n/).map(normalizeText).filter(Boolean);
  const municipalityRow = lines.findIndex(line => /Munic[ií]pio(?:\s+Beneficiado)?\b/i.test(line));
  const candidates = municipalityRow >= 0
    ? lines.slice(Math.max(0, municipalityRow - 1), municipalityRow + 5)
    : lines;
  for (const line of candidates) {
    const location = extractLocation(line);
    if (location.city) return location;
  }
  return extractLocation(rawQuadro);
};

// Todas as colunas e suas regras ficam centralizadas aqui: acrescente um item para criar novo campo.
export const EXTRACTION_RULES = [
  { key: 'proposal', label: COLUMNS[0], extract: text => firstMatch(text, [/Proposta\s*n[ºo°.]?\s*(\d{5,6}\/\d{4})\b/i]) },
  { key: 'process', label: COLUMNS[1], extract: text => firstMatch(text, [/PROCESSO\s*N[ºo°.]?\s*([\d.]+\/\d{4}-\d{2})/i, /Processo\s*n[ºo°.]?\s*([\d.]+\/\d{4}-\d{2})/i]) },
  { key: 'technicalNote', label: 'Nota Técnica', extract: text => firstMatch(text, [/Nota\s+T[eé]cnica\s+n?[ºo°.]?\s*([\d]+\/\d{4}\/[A-Z0-9-\/]+)/i]) },
  { key: 'sei', label: 'SEI', extract: text => firstMatch(text, [/Nota\s+T[eé]cnica\s+\d+\s*\((\d{6,9})\)/i, /c[oó]digo\s+verificador\s*(\d{6,9})/i, /SEI\s+n?[ºo°.]?\s*(\d{6,9})/i]) },
  { key: 'recipient', label: COLUMNS[3], extract: text => /MUNIC[IÍ]PIO\s+DE/i.test(text) ? 'Município' : (/ESTADO\s+DE/i.test(text) ? 'Estado' : '') },
  { key: 'city', label: COLUMNS[4], extract: text => extractLocation(text).city },
  { key: 'uf', label: COLUMNS[5], extract: text => extractLocation(text).uf },
  { key: 'transfer', label: COLUMNS[6], extract: text => cleanMoney(firstMatch(text, [/Valor\s+de\s+Repasse\s*R?\$?\s*([\d.]+,\d{1,2})/i])) },
  { key: 'committed', label: COLUMNS[7], extract: text => cleanMoney(firstMatch(text, [/Valor\s+Empenhado\s*R?\$?\s*([\d.]+,\d{1,2})/i])) },
  { key: 'needed', label: COLUMNS[8], extract: text => cleanMoney(firstMatch(text, [/Necessidade\s+de\s+Empenho\s*R?\$?\s*([\d.]+,\d{1,2})/i])) }
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

/** Centraliza as verificações documentais e retorna uma linha de relatório por inconsistência. */
export function validateTechnicalNote(rawText, parsed = parseTechnicalNote(rawText)) {
  const text = normalizeText(rawText);
  const item11 = extractSection(text, '1.1', '1.2');
  const item12 = extractSection(text, '1.2', '2');
  const item31 = extractSection(text, '3.1', '3.2');
  const item51 = extractSection(text, '5.1', '5.2');
  const rawQuadro = rawText.match(/Quadro\s*1\s*-?[\s\S]*?(?=\s*3\s*\.\s*3\s*\.|\s*Fonte\s*:|$)/i)?.[0] || '';
  const quadro = normalizeText(rawQuadro);
  const item31Location = extractLocation(item31);
  const quadroCity = extractQuadroLocation(rawQuadro).city;
  const values = extractQuadroValues(quadro);
  const item51Transfer = extractAmount(item51, [/(?:valor\s+total\s+de\s+)?repasse\s+de\s*R?\$?\s*([\d.]+,\d{1,2})/i]);
  const item51Needed = extractAmount(item51, [/necessidade\s+de\s+empenho\s+de\s*R?\$?\s*([\d.]+,\d{1,2})/i]);
  const errors = [];
  const report = (verification, description) => errors.push({
    'Nº da Nota Técnica': firstMatch(parsed[COLUMNS[2]] || '', [/Nota\s+T[eé]cnica\s+nº\s*(\d+\/\d{4})/i]) || firstMatch(text, [/Nota\s+T[eé]cnica\s+n?[ºo°.]?\s*(\d+\/\d{4})/i]),
    'Nº do Processo': parsed[COLUMNS[1]] || '', 'Nº da Proposta': parsed[COLUMNS[0]] || '',
    'Tipo da Verificação': verification, 'Descrição do Erro': description
  });
  if (/convalidar|convalida[çc][ãa]o/i.test(item11) && !/convalidar|convalida[çc][ãa]o/i.test(item12)) report('Convalidação', 'O item 1.1 menciona convalidação, mas o item 1.2 não contém “convalidar” nem “convalidação”.');
  if (item31Location.city && quadroCity && normalizeComparable(item31Location.city) !== normalizeComparable(quadroCity)) report('Município', 'Município do item 3.1 difere do Quadro 1.');
  if (values.transfer && values.committed && values.needed && toCents(values.transfer) - toCents(values.committed) !== toCents(values.needed)) report('Valores', 'Valor de Repasse − Valor Empenhado ≠ Necessidade de Empenho no Quadro 1.');
  if (values.transfer && item51Transfer && toCents(values.transfer) !== toCents(item51Transfer)) report('Item 5.1', 'Valor de Repasse do item 5.1 difere do Quadro 1.');
  if (values.needed && item51Needed && toCents(values.needed) !== toCents(item51Needed)) report('Item 5.1', 'Necessidade de Empenho do item 5.1 difere do Quadro 1.');
  return errors;
}
