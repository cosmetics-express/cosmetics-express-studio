export function csvCell(value: unknown) {
  const str = String(value ?? '');
  return '"' + (/^[\s]*[=+\-@\t\r]/.test(str) ? "'" + str : str).replaceAll('"', '""') + '"';
}
export function toCsv(rows: unknown[][]) {
  return '\ufeff' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n');
}
