// ── Every system, in one list ────────────────────────────────

import { CLASSIC } from './systems-classic.js';
import { MODERN } from './systems-modern.js';
import { TCG } from './systems-tcg.js';

export const GROUPS = [
  { id: 'classic', label: { en: 'Classics',      es: 'Clásicos' },  items: CLASSIC },
  { id: 'modern',  label: { en: 'Modern casual', es: 'Casual moderno' }, items: MODERN },
  { id: 'tcg',     label: { en: 'Collectible',   es: 'Coleccionables' }, items: TCG },
];

export const SYSTEMS = GROUPS.flatMap((g) => g.items.map((s) => ({ ...s, group: g.id })));

export function systemById(id) {
  return SYSTEMS.find((s) => s.id === id) || null;
}

/**
 * Where the non-obvious claims come from. Anything here that is a judgement
 * call is written as one in the copy; these are for the facts.
 */
export const SOURCES = [
  {
    label: 'Mitos y Leyendas: Chilean origin, gold resource, 2009 bankruptcy',
    url: 'https://en.wikipedia.org/wiki/Myths_and_Legends',
  },
  {
    label: 'New World Order: capping complexity at common',
    url: 'https://mtg.fandom.com/wiki/New_World_Order',
  },
  {
    label: 'Complexity creep, and the three kinds of complexity',
    url: 'https://mtg.fandom.com/wiki/Complexity_creep',
  },
  {
    label: 'Resource systems as the backbone of a TCG',
    url: 'https://remptongames.com/2017/07/20/a-re-source-of-pride-designing-resource-systems-in-collectible-games/',
  },
  {
    label: 'Cost and meaningful decisions, from a working TCG design team',
    url: 'https://fabtcg.com/articles/designer-cost-meaningful-decisions/',
  },
];
