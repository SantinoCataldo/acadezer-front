/**
 * APU-02: utilidades de texto sobre el contenido enriquecido de un apunte.
 *
 * El backend guarda el HTML tal cual, así que para mostrar un resumen en la
 * lista y para saber si el usuario realmente escribió algo hay que leer el
 * texto sin etiquetas.
 */

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

function decodeEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity] ?? entity);
}

/** Texto visible de un HTML de apunte, sin etiquetas y con espacios colapsados. */
export function notePlainText(html: string): string {
  const withoutBlocks = html
    .replace(/<\s*(br|\/p|\/li|\/h[1-6]|\/div|\/blockquote)[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '');
  return decodeEntities(withoutBlocks).replace(/\s+/g, ' ').trim();
}

/** Resumen corto para la lista de apuntes. */
export function noteExcerpt(html: string, max = 140): string {
  const text = notePlainText(html);
  if (text.length <= max) return text;
  return `${text.slice(0, max).trimEnd()}…`;
}

/** Un apunte necesita título y algo de contenido, igual que valida el backend. */
export function hasContent(html: string): boolean {
  return notePlainText(html).length > 0;
}
