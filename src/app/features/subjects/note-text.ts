const ENTITIES: Record<string, string> = {
  '&': '&',
  '<': '<',
  '>': '>',
  '"': '"',
  "'": "'",
  '&nbsp;': ' ',
};

function decodeEntities(value: string): string {
  return value.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (entity) => ENTITIES[entity] ?? entity);
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
  return `${text.slice(0, max).trimEnd()}...`;
}

export function hasContent(html: string): boolean {
  return notePlainText(html).length > 0;
}

export function validateContentForBackend(html: string): string | null {
  if (!hasContent(html)) return 'El contenido no puede quedar vacio.';
  return null;
}