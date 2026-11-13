const ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  '#39': "'",
  nbsp: ' ',
};

function decodeEntities(value: string): string {
  return value.replace(/&([a-z]+|#\d+);/gi, (entity, nombre: string) => ENTITIES[nombre] ?? entity);
}

export function notePlainText(html: string): string {
  const withoutBlocks = html
    .replace(/<\s*(br|\/p|\/li|\/h[1-6]|\/div|\/blockquote)[^>]*>/gi, ' ')
    .replace(/<[^>]*>/g, '');
  return decodeEntities(withoutBlocks).replace(/\s+/g, ' ').trim();
}

export function noteExcerpt(html: string, max = 140): string {
  const text = notePlainText(html);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  const head = (lastSpace > 0 ? cut.slice(0, lastSpace) : cut).trimEnd();
  return `${head}…`;
}

export function hasContent(html: string): boolean {
  return notePlainText(html).length > 0;
}

export function validateContentForBackend(html: string): string | null {
  if (!hasContent(html)) return 'El contenido no puede quedar vacío.';
  return null;
}