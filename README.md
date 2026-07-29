# Planilha de Controle de AIO - FNHIS Sub-50

Aplicação estática, sem backend, para extrair dados de até 50 Notas Técnicas em PDF e exportar um Excel consolidado.

## Uso

1. Hospede esta pasta no GitHub Pages (ou abra via servidor estático).
2. Selecione ou arraste PDFs, processe e exporte o arquivo Excel.
3. Para executar os testes do parser, abra `tests/run-tests.html` por um servidor estático e confira o console.

As regras de extração estão todas em `js/parser.js`, no vetor `EXTRACTION_RULES`. Adicione uma regra ali e sua coluna correspondente em `COLUMNS` para ampliar os campos futuramente.

> Os PDFs nunca saem do navegador. PDF.js e SheetJS são carregados de CDNs públicos, portanto é necessária conexão no primeiro carregamento da página.
