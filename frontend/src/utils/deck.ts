import type { DeckCard } from '../services/api';

export function totalCards(cards: DeckCard[]): number {
  return cards.reduce((sum, card) => sum + card.count, 0);
}

/** Matches P(X >= 1) from the backend's hypergeometric engine, calculated locally for instant table updates. */
export function chanceOfDrawing(deckSize: number, copies: number, handSize: number): number {
  if (deckSize <= 0 || copies <= 0 || handSize <= 0) return 0;
  if (copies > deckSize || handSize > deckSize) return 0;
  if (handSize > deckSize - copies) return 100;
  // P(0) = product_{i=0}^{n-1} (N-K-i)/(N-i); stable without factorial overflow.
  let noCopies = 1;
  for (let i = 0; i < handSize; i++) noCopies *= (deckSize - copies - i) / (deckSize - i);
  return Math.max(0, Math.min(100, (1 - noCopies) * 100));
}

/** Parse lines like `3x Ash Blossom`, `3 Ash Blossom`, `Ash Blossom x3`, or `Ash Blossom`.
 * Comment lines and common deck-section headings are ignored. Duplicates are added together.
 */
export function parseDecklist(text: string): DeckCard[] {
  const items = new Map<string, DeckCard>();
  const lines = text.split(/\r?\n/);
  if (lines.length > 500) throw new Error('Decklist is too long (maximum 500 lines).');
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index].trim();
    if (!line || /^(#|\/\/|;)/.test(line) || /^(?:(?:main|side|extra)\s+deck|main|side|extra|monsters?|spells?|traps?|creatures?|lands?|sideboard|deck)\s*:?$/i.test(line)) continue;
    const prefix = line.match(/^(\d+)\s*x?\s+(.+)$/i);
    const suffix = line.match(/^(.+?)\s+x(\d+)$/i);
    const count = Number(prefix?.[1] ?? suffix?.[2] ?? 1);
    const name = (prefix?.[2] ?? suffix?.[1] ?? line).trim();
    if (!name || name.length > 120 || !Number.isSafeInteger(count) || count < 1 || count > 99) {
      throw new Error(`Invalid card or quantity on line ${index + 1}: ${line}`);
    }
    const key = name.toLocaleLowerCase();
    const existing = items.get(key);
    if (existing) {
      if (existing.count + count > 99) throw new Error(`Too many copies of "${name}" (maximum 99).`);
      existing.count += count;
    } else {
      items.set(key, { name, count });
    }
  }
  if (items.size === 0) throw new Error('Enter at least one card, for example "3x Ash Blossom".');
  return Array.from(items.values());
}

/** Fisher-Yates; each physical card copy is represented and drawn at most once. */
export function drawHand(cards: DeckCard[], count: number): string[] {
  const pool = cards.flatMap((card) => Array.from({ length: card.count }, () => card.name));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}
