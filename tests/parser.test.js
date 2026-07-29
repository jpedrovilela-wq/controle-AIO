import { COLUMNS, parseTechnicalNote, validateTechnicalNote } from '../js/parser.js';

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
  [COLUMNS[6]]: '3250000,00', [COLUMNS[7]]: '315921,16', [COLUMNS[8]]: '2934078,84'
};
for (const [field, value] of Object.entries(expected)) console.assert(parsed[field] === value, `${field}: esperado ${value}, recebido ${parsed[field]}`);
console.assert(parseTechnicalNote('ESTADO DE GOIÁS')[COLUMNS[3]] === 'Estado', 'Tomador Estado');
console.assert(
  parseTechnicalNote('Necessidade de Empenho R$ 2.520.000,0')[COLUMNS[8]] === '2520000,00',
  'Completa decimal ausente e remove pontos'
);

const validationExcerpt = `
1 . 1 . Trata-se de convalidar a autorização para início de execução do objeto.
1 . 2 . A convalidação visa cumprir o disposto no Ofício.
2 . REFERÊNCIAS
3 . 1 . Solicitação para construção no Município de VICENTINÓPOLIS/GO.
3 . 2 . Dados complementares.
Quadro 1 - Dados gerais. Município Beneficiado Município de VICENTINÓPOLIS/GO.
Valor de Repasse R$ 3.250.000,00 Valor Empenhado R$ 315.921,16 Necessidade de Empenho R$ 2.934.078,84 Fonte: DHR.
5 . 1 . No valor total de repasse de R$ 3.250.000,00, implicará na necessidade de empenho de R$ 2.934.078,84.
5 . 2 . Continuação.`;
console.assert(validateTechnicalNote(`${realExcerpt} ${validationExcerpt}`, parsed).length === 0, 'Nota de exemplo sem inconsistências');
const invalid = validateTechnicalNote(`${realExcerpt} ${validationExcerpt.replace('A convalidação visa', 'O texto não possui o termo').replace('VICENTINÓPOLIS/GO.', 'GOIÂNIA/GO.').replace('R$ 2.934.078,84 Fonte', 'R$ 2.000.000,00 Fonte')}`, parsed);
console.assert(invalid.some(error => error['Tipo da Verificação'] === 'Convalidação'), 'Detecta convalidação ausente');
console.assert(invalid.some(error => error['Tipo da Verificação'] === 'Município'), 'Detecta município divergente');
console.assert(invalid.some(error => error['Tipo da Verificação'] === 'Valores'), 'Detecta divergência de valores');
const saoPaulo = `${realExcerpt} ${validationExcerpt}`.replaceAll('VICENTINÓPOLIS', 'SÃO PAULO');
console.assert(
  !validateTechnicalNote(saoPaulo.replace('Município de SÃO PAULO/GO.', 'Município de São Paulo/GO.'), parseTechnicalNote(saoPaulo))
    .some(error => error['Tipo da Verificação'] === 'Município'),
  'Reconhece São Paulo como igual a SÃO PAULO'
);
console.log('Todos os testes do parser passaram.');
