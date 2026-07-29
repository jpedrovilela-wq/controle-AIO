import { extractPdfText } from './pdf.js';
import { COLUMNS, parseTechnicalNote } from './parser.js';
import { exportRowsToExcel } from './excel.js';
import { formatBytes } from './utils.js';

const state = { files: [], rows: [] };
const $ = id => document.getElementById(id);
const elements = Object.fromEntries(['fileInput','selectButton','dropZone','fileList','fileItemTemplate','processButton','exportButton','clearButton','progressBar','progressText','loadedCount','processedCount','errorCount','fileSummary','tableHead','tableBody','previewSummary','themeToggle'].map(id => [id, $(id)]));

function updateCounters() {
  const processed = state.files.filter(item => item.status === 'success').length;
  const errors = state.files.filter(item => item.status === 'error').length;
  elements.loadedCount.textContent = state.files.length; elements.processedCount.textContent = processed; elements.errorCount.textContent = errors;
  elements.fileSummary.textContent = state.files.length ? `${state.files.length} arquivo(s) na ordem de inserção.` : 'Nenhum PDF selecionado.';
  elements.processButton.disabled = !state.files.length || state.files.some(item => item.status === 'processing');
  elements.exportButton.disabled = !state.rows.length;
  elements.clearButton.disabled = !state.files.length;
}
function renderFiles() {
  elements.fileList.replaceChildren();
  state.files.forEach(item => {
    const node = elements.fileItemTemplate.content.firstElementChild.cloneNode(true);
    node.querySelector('.file-name').textContent = item.file.name; node.querySelector('.file-size').textContent = formatBytes(item.file.size);
    const status = node.querySelector('.file-status');
    const labels = { pending: 'Aguardando', processing: 'Processando…', success: '✔ Processado', error: '❌ Erro' };
    status.textContent = labels[item.status]; status.className = `file-status status-${item.status}`;
    if (item.error) status.title = item.error;
    elements.fileList.append(node);
  }); updateCounters();
}
function renderTable() {
  elements.tableHead.innerHTML = `<tr>${COLUMNS.map(name => `<th>${name}</th>`).join('')}</tr>`;
  elements.tableBody.replaceChildren();
  if (!state.rows.length) { elements.tableBody.innerHTML = '<tr><td class="empty-state" colspan="9">Nenhum resultado para exibir.</td></tr>'; }
  else state.rows.forEach(row => { const tr = document.createElement('tr'); COLUMNS.forEach(column => { const td = document.createElement('td'); td.textContent = row[column] || ''; tr.append(td); }); elements.tableBody.append(tr); });
  elements.previewSummary.textContent = state.rows.length ? `${state.rows.length} linha(s) pronta(s) para exportação.` : 'Os dados extraídos aparecerão aqui.';
}
function setProgress(done, total) { const percent = total ? Math.round((done / total) * 100) : 0; elements.progressBar.style.width = `${percent}%`; elements.progressText.textContent = `${percent}%`; }
function addFiles(fileList) {
  const incoming = [...fileList].filter(file => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
  const capacity = 50 - state.files.length;
  state.files.push(...incoming.slice(0, Math.max(capacity, 0)).map(file => ({ file, status: 'pending', error: '' })));
  renderFiles();
}
async function processFiles() {
  state.rows = []; setProgress(0, state.files.length);
  for (const [index, item] of state.files.entries()) {
    item.status = 'processing'; item.error = ''; renderFiles();
    try { const text = await extractPdfText(item.file); state.rows.push(parseTechnicalNote(text)); item.status = 'success'; }
    catch (error) { item.status = 'error'; item.error = error.message || 'Não foi possível ler o PDF.'; }
    renderFiles(); renderTable(); setProgress(index + 1, state.files.length);
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  // Mantém o botão de exportação disponível para reemitir o arquivo, mas baixa a primeira versão ao concluir.
  if (state.rows.length) exportRowsToExcel(state.rows);
}
function clearAll() { state.files = []; state.rows = []; elements.fileInput.value = ''; setProgress(0, 0); renderFiles(); renderTable(); }

elements.selectButton.addEventListener('click', () => elements.fileInput.click()); elements.fileInput.addEventListener('change', event => addFiles(event.target.files));
['dragenter','dragover'].forEach(name => elements.dropZone.addEventListener(name, event => { event.preventDefault(); elements.dropZone.classList.add('dragover'); }));
['dragleave','drop'].forEach(name => elements.dropZone.addEventListener(name, event => { event.preventDefault(); elements.dropZone.classList.remove('dragover'); }));
elements.dropZone.addEventListener('drop', event => addFiles(event.dataTransfer.files)); elements.processButton.addEventListener('click', processFiles); elements.clearButton.addEventListener('click', clearAll);
elements.exportButton.addEventListener('click', () => exportRowsToExcel(state.rows));
elements.themeToggle.addEventListener('click', () => { const dark = document.documentElement.dataset.theme !== 'dark'; document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('aio-theme', dark ? 'dark' : 'light'); });
if (localStorage.getItem('aio-theme') === 'dark') document.documentElement.dataset.theme = 'dark'; renderFiles(); renderTable();
