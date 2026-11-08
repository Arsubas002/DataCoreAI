const paths = {
  inicio:
    '<path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2h-4v-7H9v7H5a2 2 0 0 1-2-2z"/>',
  productos:
    '<rect x="4" y="6" width="16" height="15" rx="3"/><path d="M8 7V5a4 4 0 0 1 8 0v2M9 11h6"/>',
  ventas: '<path d="M4 17 10 11l4 3 6-9M14 5h6v6M4 21h16"/>',
  inventario:
    '<path d="m3 7 9-4 9 4v10l-9 4-9-4ZM3 7l9 5 9-5M12 12v9M7 5l10 5"/>',
  reportes: '<path d="M5 20V4M5 20h15M9 16v-4M14 16V8M19 16V5"/>',
  asistente:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5ZM20 2v4M18 4h4"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5l1.5 1.5M5 19l1.5-1.5M17.5 6.5l1.5-1.5"/>',
  moon: '<path d="M20 14A8 8 0 0 1 10 4a8.5 8.5 0 1 0 10 10Z"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4 4"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  arrow: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  down: '<path d="M12 3v12m-5-5 5 5 5-5M5 17v4h14v-4"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  up: '<path d="M12 19V5m-6 6 6-6 6 6"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  shirt: '<path d="m8 4-6 4 3 5 3-2v10h8V11l3 2 3-5-6-4a4 4 0 0 1-8 0Z"/>',
  jeans: '<path d="M6 3h12l2 18h-6l-2-11-2 11H4ZM6 6h12M12 3v7"/>',
  jacket: '<path d="M8 3 3 8l2 12h4V9l3-3 3 3v11h4l2-12-5-5-4 3ZM12 6v15"/>',
  shoe: '<path d="m4 7 5 5 5-2 3 5 5 2v4H2v-8ZM10 14l2-2M13 16l2-2"/>',
  bag: '<rect x="5" y="6" width="14" height="16" rx="3"/><path d="M9 6V4a3 3 0 0 1 6 0v2M8 14h8v5H8ZM9 10h6"/>',
};
export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.productos}</svg>`;
}
export const pages = {
  inicio: 'Inicio',
  productos: 'Productos',
  ventas: 'Ventas',
  inventario: 'Inventario',
  reportes: 'Reportes',
  asistente: 'Asistente IA',
};
