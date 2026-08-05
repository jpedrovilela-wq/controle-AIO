import { COLUMNS, parseTechnicalNote, validateTechnicalNote } from '../js/parser.js';

console.assert = (condition, message) => {
  if (!condition) throw new Error(message || 'Teste falhou.');
};

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

const printedGuajeru = `
3.1. Construção de unidades habitacionais no Município de Guajeru/BA.
3.2. Dados complementares.
Quadro 1 - Dados gerais do Instrumento.
Programa Minha Casa, Minha Vida
Ação 232000TI
Modalidade Termo de Compromisso
Compromissário CNPJ 13.284.658/0001-14
MUNICIPIO DE GUAJERU
Município
Município de Guajeru/BA
Beneficiado
Valor de Repasse R$ 2.800.000,00
Valor Empenhado R$ 839.398,40
Necessidade de
R$ 1.960.601,60
Empenho
Fonte: DHR.
5.1. Repasse de R$ 2.800.000,00 e necessidade de empenho de R$ 1.960.601,60.
5.2. Continuação.`;
console.assert(
  !validateTechnicalNote(printedGuajeru, parseTechnicalNote(printedGuajeru))
    .some(error => error['Tipo da Verificação'] === 'Município'),
  'Reconhece Guajeru no item 3.1 e no Quadro 1 impresso'
);

for (const [city, uf] of [['São José da Laje', 'AL'], ['Coqueiro Seco', 'AL']]) {
  const printedCity = `
  3.1. Obra no Município de ${city}/${uf}.
  3.2. Dados complementares.
  Quadro 1 - Dados gerais.
  MUNICIPIO DE ${city.toLocaleUpperCase('pt-BR')}
  Município
  Município de ${city}/${uf}
  Beneficiado
  Fonte: DHR.`;
  console.assert(
    !validateTechnicalNote(printedCity, parseTechnicalNote(printedCity))
      .some(error => error['Tipo da Verificação'] === 'Município'),
    `Reconhece ${city}/${uf} no item 3.1 e no Quadro 1 impresso`
  );
}

const printedCommitment = `
Quadro 1 - Dados gerais.
Valor de Repasse R$ 2.800.000,00
Valor Empenhado R$ 839.398,40
Necessidade de
R$ 1.960.601,60
Empenho
Fonte: DHR.`;
console.assert(
  parseTechnicalNote(printedCommitment)[COLUMNS[8]] === '1960601,60',
  'Extrai Necessidade de Empenho pela última quantia do Quadro 1 impresso'
);
console.assert(
  parseTechnicalNote(printedCommitment)[COLUMNS[6]] === '2800000,00' &&
  parseTechnicalNote(printedCommitment)[COLUMNS[7]] === '839398,40',
  'Mantém os três valores financeiros normalizados antes da exportação numérica'
);

const printedVerticalCommitment = `
Quadro 1 - Dados gerais.
Valor de Repasse R$ 2.800.000,00
Valor
R$ 280.000,00
Empenhado
Necessidade de
R$ 2.520.000,00
Empenho
Fonte: DHR.`;
console.assert(
  parseTechnicalNote(printedVerticalCommitment)[COLUMNS[7]] === '280000,00',
  'Extrai Valor Empenhado quando a coluna impressa é lida verticalmente'
);

const fragmentedMunicipality = `
3.1. Obra no Município de Goianinha/RN.
3.2. Dados complementares.
Quadro 1 - Dados gerais.
Município Bene fi ciado Município de Goianinha/RN
Fonte: DHR.`;
console.assert(
  !validateTechnicalNote(fragmentedMunicipality, parseTechnicalNote(fragmentedMunicipality))
    .some(error => error['Tipo da Verificação'] === 'Município'),
  'Reconhece Município Beneficiado quando Beneficiado é fragmentado'
);

const sectionWithoutFinalDot = `
1.1. Trata-se de convalidar a autorização.
1.2 A convalidação visa cumprir o disposto no Ofício.
2. REFERÊNCIAS`;
console.assert(
  !validateTechnicalNote(sectionWithoutFinalDot, parseTechnicalNote(sectionWithoutFinalDot))
    .some(error => error['Tipo da Verificação'] === 'Convalidação'),
  'Reconhece o item 1.2 mesmo sem ponto final'
);
const beneficiaryOnSeparateLine = `
3.1. Obra no Município de Esperantina/PI.
3.2. Dados complementares.
Quadro 1 - Dados gerais.
MUNICIPIO DE ESPERANTINA
Município Município de
Bene fi ciado ESPERANTINA/PI
Fonte: DHR.`;
console.assert(
  !validateTechnicalNote(beneficiaryOnSeparateLine, parseTechnicalNote(beneficiaryOnSeparateLine))
    .some(error => error['Tipo da Verificação'] === 'Município'),
  'Reconhece município do Beneficiado fragmentado em linha separada'
);
console.log('Todos os testes do parser passaram.');
