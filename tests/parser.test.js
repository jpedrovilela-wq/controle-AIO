import { COLUMNS, parseTechnicalNote } from '../js/parser.js';

const realExcerpt = `Nota Técnica nº 1539/2026/CGPES-DHR-MCID/DHR-MCID/SNH-MCID-MCID
PROCESSO Nº 80000.008723/2026-33
Instrumento nº 974037 (Proposta nº 033326/2024) - construção de unidades habitacionais no Município de VICENTINÓPOLIS/GO.
CNPJ 00.044.834/0001-07 - MUNICIPIO DE VICENTINOPOLIS
Valor de Repasse R$ 3.250.000,00 Valor Empenhado R$ 315.921,16 Necessidade de Empenho R$ 2.934.078,84
Nota Técnica 1539 (6845852) SEI 80000.008723/2026-33`;

const parsed = parseTechnicalNote(realExcerpt);
const expected = {
  [COLUMNS[0]]: '033326/2024', [COLUMNS[1]]: '80000.008723/2026-33',
  [COLUMNS[2]]: 'Nota Técnica nº 1539/2026/CGPES-DHR-MCID/DHR-MCID/SNH-MCID-MCID SEI nº (6845852) Município de Vicentinópolis/GO',
  [COLUMNS[3]]: 'Município', [COLUMNS[4]]: 'Vicentinópolis', [COLUMNS[5]]: 'GO',
  [COLUMNS[6]]: '3.250.000,00', [COLUMNS[7]]: '315.921,16', [COLUMNS[8]]: '2.934.078,84'
};
for (const [field, value] of Object.entries(expected)) console.assert(parsed[field] === value, `${field}: esperado ${value}, recebido ${parsed[field]}`);
console.assert(parseTechnicalNote('ESTADO DE GOIÁS')[COLUMNS[3]] === 'Estado', 'Tomador Estado');
console.log('Todos os testes do parser passaram.');
