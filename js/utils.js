export const normalizeText = (value = '') => value.replace(/\u00ad/g, '').replace(/\s+/g, ' ').trim();

export function titleCaseBrazilian(value = '') {
  const lowerWords = new Set(['da', 'das', 'de', 'do', 'dos', 'e']);
  return normalizeText(value).toLocaleLowerCase('pt-BR').split(' ').map((word, index) =>
    index && lowerWords.has(word) ? word : word.charAt(0).toLocaleUpperCase('pt-BR') + word.slice(1)
  ).join(' ');
}

export function formatBytes(bytes) {
  if (!bytes) return '0 KB';
  const units = ['B', 'KB', 'MB'];
  const power = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** power).toFixed(power ? 1 : 0)} ${units[power]}`;
}
