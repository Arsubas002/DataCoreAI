// Purpose-built schematic illustrations. No external images or invented product specs.
const shapes = {
  1: `<path class="object-fill" d="m35 61 157-19 25 71-158 15Z"/><path d="m35 61 157-19 25 71-158 15Zm11 11 141-17M51 88l141-17M57 105l140-17"/>${Array.from({ length: 11 }, (_, i) => `<path d="m${48 + i * 12} ${59 - i * 1.4} 14 47"/>`).join("")}<path d="m84 109 77-9"/>`,
  2: '<path class="object-fill" d="M81 109c-18-29-8-71 16-82 27-12 57 7 65 39 9 36-7 65-31 70-20 4-39-7-50-27Z"/><path d="M81 109c-18-29-8-71 16-82 27-12 57 7 65 39 9 36-7 65-31 70-20 4-39-7-50-27ZM110 28l10 42M78 78l84-18"/><rect x="109" y="40" width="7" height="20" rx="3" transform="rotate(-13 112 50)"/>',
  3: '<path class="object-fill" d="M58 93V75a62 62 0 0 1 124 0v18l-13-1V75a49 49 0 0 0-98 0v17Z"/><path d="M58 93V75a62 62 0 0 1 124 0v18M71 92V75a49 49 0 0 1 98 0v17"/><rect x="49" y="82" width="31" height="54" rx="13"/><rect x="161" y="82" width="31" height="54" rx="13"/><path d="M80 92v36M161 92v36"/>',
  4: '<path class="object-fill" d="m57 101 99-59 33 48-99 59Z"/><path d="m57 101 99-59 33 48-99 59Zm99-59 22-14 34 48-23 14M181 41l6 8M193 58l6 8M85 101l50-30M91 111l21-12"/><circle cx="151" cy="74" r="4"/>',
  5: '<rect class="object-fill" x="49" y="39" width="140" height="66" rx="28"/><rect x="49" y="39" width="140" height="66" rx="28"/><circle cx="118" cy="72" r="22"/><circle cx="118" cy="72" r="13"/><path d="M94 105v13h50v-13M102 118l-17 20h70l-18-20"/><circle cx="167" cy="63" r="3"/>',
  6: '<path class="object-fill" d="m65 33 110 9-9 107-110-9Z"/><path d="m65 33 110 9-9 107-110-9Zm8 1-9 107M89 59l63 5M87 76l63 5M86 93l63 5M84 110l63 5"/>',
  7: '<path class="object-fill" d="m55 127 111-97 13 15L69 141Z"/><path d="m55 127 111-97 13 15L69 141Zm111-97 10-8 13 15-10 8M55 127l-7 23 21-9M159 46l-10-12 28-24"/>',
  8: '<path class="object-fill" d="m60 117 84-89 36 34-84 89Z"/><path d="m60 117 84-89 36 34-84 89Zm84-89 14-15 36 34-14 15M60 117l-9 16 15 14 17-10M117 61l23 21"/>',
  9: '<path class="object-fill" d="M44 56h61l13-14h69v95H44Z"/><path d="M44 56h61l13-14h69v95H44Zm0 20h152l-9 61M58 56V30h105v12"/>',
  10: '<path class="object-fill" d="M61 32h118v113H61Z"/><path d="M61 32h118v113H61ZM61 44h118M75 25v15M96 25v15M117 25v15M138 25v15M159 25v15M79 65h80M79 85h80M79 105h53"/>',
  11: '<path class="object-fill" d="M64 49h94v57a47 31 0 0 1-94 0Z"/><ellipse cx="111" cy="49" rx="47" ry="13"/><path d="M64 49v57a47 31 0 0 0 94 0V49M158 62h13a23 23 0 0 1 0 46h-13M78 139h92"/>',
  12: '<path class="object-fill" d="m134 46 35 26-40 24-27-35Z"/><path d="m134 46 35 26-40 24-27-35Zm-28 9L87 82l34 40M87 82 70 51l41-23 23 18M121 122v10M82 141h80l-9-9H91Z"/><circle cx="87" cy="82" r="6"/>',
  13: '<path class="object-fill" d="m52 68 111-17 29 29v55l-111 18-29-29Z"/><path d="m52 68 111-17 29 29v55l-111 18-29-29Zm0 0 29 30 111-18M81 98v55M107 64l28 26M130 59l28 27M56 102l26 27M100 116l73-12"/><path d="M80 64V29l10-3v37M105 61V19l10-3v44M145 53V25l10-1v28"/>',
  14: '<path class="object-fill" d="M91 43v16c-16 10-19 17-19 33v35c0 22 83 22 83 0V92c0-16-4-23-20-33V43Z"/><path d="M91 43v16c-16 10-19 17-19 33v35c0 22 83 22 83 0V92c0-16-4-23-20-33V43ZM91 43v-17h44v17ZM73 94c21 13 61 13 81 0M73 119c21 13 61 13 81 0"/>',
  15: '<circle class="object-fill" cx="120" cy="82" r="62"/><circle cx="120" cy="82" r="62"/><circle cx="120" cy="82" r="53"/><path d="M120 37v8M120 119v8M75 82h8M157 82h8M120 82V53M120 82l24 14"/><circle cx="120" cy="82" r="3"/>',
  16: '<path class="object-fill" d="M69 62c0-53 102-53 102 0v65a14 14 0 0 1-14 14H83a14 14 0 0 1-14-14Z"/><path d="M69 62c0-53 102-53 102 0v65a14 14 0 0 1-14 14H83a14 14 0 0 1-14-14ZM104 27V13h31v14M69 62h102M88 95h65v31H88ZM88 103h65M84 61v23M156 61v23"/>',
  17: '<path class="object-fill" d="m55 74 113-28c40-9 56 55 16 65l-113 28c-38 9-54-56-16-65Z"/><path d="m55 74 113-28c40-9 56 55 16 65l-113 28c-38 9-54-56-16-65ZM55 74c30-7 46 57 16 65M70 89l121-29M85 90l8 25"/>',
  18: '<path class="object-fill" d="m89 31 69 10-14 91-69-10Z"/><path d="m89 31 69 10-14 91-69-10ZM96 41l52 8-10 69-53-8M108 128l-13 16h69l-25-13M116 96l-10 5 48 10"/>',
  19: '<path d="M81 45c-67 16-39 113 33 80 54-25-10-76 18-91 17-9 31 4 34 13"/><path class="object-fill" d="m66 28 24-7 9 29-24 7Zm92 22 18-4 9 28-18 5Z"/><path d="m66 28 24-7 9 29-24 7Zm92 22 18-4 9 28-18 5ZM71 28l-4-12 15-5 4 12M164 49l-2-9 11-3 3 9"/>',
  20: '<path class="object-fill" d="m46 59 119-24 42 83-119 24Z"/><path d="m46 59 119-24 42 83-119 24ZM54 69l37 66M91 135l108-22"/>',
};

export function art(product, large = false) {
  const code = Number(product.code.slice(-3));
  const label = product.name
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");
  return `<div class="product-art family-${product.category === "Tecnología" ? "tech" : product.category === "Papelería" ? "paper" : product.category === "Hogar" ? "home" : "accessory"} ${large ? "large" : ""}"><svg viewBox="0 0 240 170" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" role="img" aria-label="Ilustración de ${label}">${shapes[code] || shapes[1]}</svg><span class="object-coordinate" aria-hidden="true">${product.code}</span></div>`;
}
