import { hasContent, noteExcerpt, notePlainText } from './note-text';

describe('note text helpers', () => {
  const formatted =
    '<h1>Clase 1</h1><p>Repasar <b>punteros</b></p><ul><li>uno</li><li>dos</li></ul>';

  it('reads the visible text of a formatted note', () => {
    expect(notePlainText(formatted)).toBe('Clase 1 Repasar punteros uno dos');
  });

  it('decodes the entities the editor can produce', () => {
    expect(notePlainText('<p>if&nbsp;(a &amp;&amp; b)</p>')).toBe('if (a && b)');
  });

  it('shortens long content for the list without cutting a word in half', () => {
    const excerpt = noteExcerpt('<p>' + 'palabra '.repeat(60) + '</p>', 40);
    expect(excerpt.endsWith('…')).toBe(true);
    expect(excerpt.replace('…', '').length).toBeLessThanOrEqual(40);
  });

  it('detects a note that only has empty formatting', () => {
    expect(hasContent('<p><br></p>')).toBe(false);
    expect(hasContent('<p>   </p>')).toBe(false);
    expect(hasContent('<p>algo</p>')).toBe(true);
  });
});
