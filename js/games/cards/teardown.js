// ── Teardown view ────────────────────────────────────────────
// The comparison. Reads the axes and systems as data, so adding a game is a
// data edit and never a view edit.

import { el } from '../../utils.js';
import { state, t, setLang } from '../../state.js';
import { AXES } from './axes.js';
import { coreRule } from './axes.js';
import { GROUPS, SYSTEMS, SOURCES } from './systems.js';

const CASUAL_AXES = AXES.filter((a) => a.group === 'casual');

/** Scale values, worst to best, so a cell can be tinted by how it scores. */
const TONE = {
  catchup:     { none: 'bad',  weak: 'mid',  strong: 'good' },
  downtime:    { high: 'bad',  low:  'mid',  none:   'good' },
  elimination: { yes:  'bad',  late: 'mid',  no:     'good' },
};

function toneFor(axisId, value) {
  if (axisId === 'teach') return value <= 5 ? 'good' : value <= 15 ? 'mid' : 'bad';
  return (TONE[axisId] || {})[value] || 'mid';
}

function cellText(axis, system) {
  const v = system[axis.id];
  if (axis.kind === 'minutes') return `${v} min`;
  if (axis.kind === 'scale') return t(axis.scale[v]);
  return t(v);
}

export function teardownView(host, ctx) {
  const lang = state.lang;
  let group = 'all';
  let openId = null;

  const root = el('div', { class: 'stack stack--loose' });
  host.appendChild(root);

  function draw() {
    root.replaceChildren(
      langBar(),
      rulePanel(),
      tableSection(),
      detailSection(),
      sourcesSection(),
    );
  }

  function langBar() {
    return el('div', { class: 'langbar' },
      el('span', { class: 'langbar__note', text: lang === 'es'
        ? 'Cards está completo en español. Los otros cuatro juegos están en inglés.'
        : 'Cards is fully bilingual. The other four games are English only.' }),
      el('div', { class: 'langbar__toggle', role: 'group', 'aria-label': 'Language' },
        ...['en', 'es'].map((code) => el('button', {
          class: `langbtn${state.lang === code ? ' is-active' : ''}`,
          type: 'button',
          'aria-pressed': String(state.lang === code),
          onclick: () => { setLang(code); ctx.rerender(); },
        }, code.toUpperCase())),
      ),
    );
  }

  function rulePanel() {
    return el('div', { class: 'corerule' },
      el('div', { class: 'corerule__label', text: lang === 'es' ? 'LA IDEA CENTRAL' : 'THE ONE IDEA' }),
      el('h2', { class: 'corerule__title', text: t(coreRule.title) }),
      el('p', { class: 'corerule__body', text: t(coreRule.body) }),
      el('code', { class: 'corerule__formula', text: coreRule.formula }),
    );
  }

  function tableSection() {
    const shown = group === 'all' ? SYSTEMS : SYSTEMS.filter((s) => s.group === group);
    const section = el('section', { class: 'section' },
      el('div', { class: 'section__header' },
        el('div', { class: 'section__titles' },
          el('h2', { class: 'section__title', text: lang === 'es' ? 'Los cuatro ejes casuales' : 'The four casual axes' }),
          el('p', { class: 'section__lead', text: lang === 'es'
            ? 'Ordenados por qué tan bien aguantan una mesa que juega una sola vez. Toca una fila para ver por qué.'
            : 'Sorted by how well they survive a table that plays once. Tap a row for why.' }),
        ),
        el('div', { class: 'toolbar' },
          ...[{ id: 'all', label: { en: 'All', es: 'Todos' } }, ...GROUPS].map((g) => el('button', {
            class: `chip${group === g.id ? ' is-active' : ''}`,
            type: 'button',
            onclick: () => { group = g.id; draw(); },
          }, t(g.label))),
        ),
      ),
    );

    const table = el('div', { class: 'cmp' });
    table.appendChild(el('div', { class: 'cmp__row cmp__row--head' },
      el('div', { class: 'cmp__game', text: lang === 'es' ? 'Juego' : 'Game' }),
      ...CASUAL_AXES.map((a) => el('div', { class: 'cmp__cell', title: t(a.hint) }, t(a.label))),
    ));

    for (const s of shown) {
      table.appendChild(el('button', {
        class: `cmp__row${openId === s.id ? ' is-open' : ''}`,
        type: 'button',
        onclick: () => { openId = openId === s.id ? null : s.id; draw(); },
      },
        el('div', { class: 'cmp__game' },
          el('strong', { text: s.name }),
          el('small', { text: s.year ? String(s.year) : t({ en: 'traditional', es: 'tradicional' }) }),
        ),
        ...CASUAL_AXES.map((a) => el('div', {
          class: `cmp__cell tone-${toneFor(a.id, s[a.id])}`,
          text: cellText(a, s),
        })),
      ));
    }
    section.appendChild(table);
    return section;
  }

  function detailSection() {
    const s = SYSTEMS.find((x) => x.id === openId);
    if (!s) {
      return el('p', { class: 'cmp__hint', text: lang === 'es'
        ? 'Elige un juego arriba para ver su sistema de recursos, qué funcionó, dónde falla y qué se puede robar.'
        : 'Pick a game above to see its resource system, what worked, where it fails, and what is worth stealing.' });
    }
    const structural = AXES.filter((a) => a.group === 'structure');
    return el('section', { class: 'section teardown-detail' },
      el('div', { class: 'section__titles' },
        el('h2', { class: 'section__title', text: s.name }),
        el('p', { class: 'section__lead', text: `${t(s.family)} · ${t(s.origin)}${s.year ? ` · ${s.year}` : ''}` }),
      ),
      el('div', { class: 'factgrid' },
        ...structural.map((a) => el('div', { class: 'fact' },
          el('div', { class: 'fact__label', text: t(a.label) }),
          el('div', { class: 'fact__value', text: cellText(a, s) }),
        )),
      ),
      el('div', { class: 'stack stack--tight' },
        prose(lang === 'es' ? 'Qué funcionó' : 'What worked', t(s.works), 'good'),
        prose(lang === 'es' ? 'Dónde falla' : 'Where it fails', t(s.failure), 'bad'),
        prose(lang === 'es' ? 'Qué robar' : 'What to steal', t(s.lesson), 'steal'),
      ),
    );
  }

  function prose(label, body, tone) {
    return el('div', { class: `prosebox prosebox--${tone}` },
      el('div', { class: 'prosebox__label', text: label }),
      el('p', { class: 'prosebox__body', text: body }),
    );
  }

  function sourcesSection() {
    return el('section', { class: 'section' },
      el('h2', { class: 'section__title', text: lang === 'es' ? 'De dónde salen los datos' : 'Where the facts come from' }),
      el('p', { class: 'section__lead', text: lang === 'es'
        ? 'Las fechas, los sistemas de recursos y la quiebra de 2009 están citados. Las lecturas de diseño son mías y están escritas como tales.'
        : 'Dates, resource systems and the 2009 bankruptcy are cited. The design readings are mine, and are written as such.' }),
      el('ul', { class: 'sourcelist' },
        ...SOURCES.map((src) => el('li', {},
          el('a', { href: src.url, target: '_blank', rel: 'noopener noreferrer', text: src.label }),
        )),
      ),
    );
  }

  draw();
  return () => { /* no listeners outside the tree */ };
}
