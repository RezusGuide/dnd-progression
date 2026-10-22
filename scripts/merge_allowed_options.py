"""Merge the GM's list (docs/zlatopryady/allowed-options.json) into the
reference data (backend/src/main/resources/data/races.json, classes.json).

Every entry gets `status`, `source`, `id` and, for unlockable ones, `unlock`.
Entries that already exist keep their key (existing characters are stored
by it) and their mechanics; the match is case-insensitive on the English
name ("Half-elf" in the list is "Half-Elf" in the data). New entries are
keyed by the list's `en` and carry no mechanics of their own (srd: false) -
the wizard asks the player for those. Re-running is safe.

Sources are short codes everywhere (data/sources.json has the full book
names); the GM list gives classes full names, mapped by CLASS_SOURCES.
"Своя раса" (key CUSTOM) is a data row of its own, hidden (undecided)
until the GM switches it on.

Usage (from the repo root):
    python -I scripts/merge_allowed_options.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OPTIONS = ROOT / 'docs' / 'zlatopryady' / 'allowed-options.json'
DATA = ROOT / 'backend' / 'src' / 'main' / 'resources' / 'data'

# Classes with mechanics written out here (SRD-style summary, no book text).
ARTIFICER = {
    'hitDie': 8,
    'saves': ['CON', 'INT'],
    'skillChoice': {'count': 2, 'from': ['INVESTIGATION', 'HISTORY', 'ARCANA', 'SLEIGHT_OF_HAND', 'MEDICINE', 'NATURE', 'PERCEPTION']},
    'proficiencies': 'Лёгкие и средние доспехи, щиты; простое оружие; воровские инструменты, инструменты ремонтника, один набор ремесленника.',
    'spellAbility': 'INT',
    'cantrips': 2,
    'equipment': [
        'Два простых оружия, лёгкий арбалет и 20 болтов, клёпаный кожаный доспех, воровские инструменты, набор исследователя подземелий',
        'Два простых оружия, лёгкий арбалет и 20 болтов, чешуйчатый доспех, воровские инструменты, набор исследователя подземелий',
    ],
}

CLASS_SOURCES = {
    "Player's Handbook": 'PH14',
    "Tasha's Cauldron of Everything": 'TCE',
    "Valda's Spire of Secrets": 'VSS',
    "Steinhardt's Guide to the Eldritch Hunt": 'SGEH',
    'Matt Mercer / Critical Role': 'CR',
    'Dungeon Masters Guild': 'DMSG',
    'laserllama': 'LL',
    'Homebrew': 'HB',
    'Unearthed Arcana': 'UA',
}

# Rows that are not in the GM list. Their status in the data is only the
# default; the GM changes it from the panel.
EXTRA = {
    'races': [{
        'key': 'CUSTOM', 'nameRu': 'Своя раса', 'srd': False, 'custom': True,
        'bonuses': None, 'speed': 30, 'size': 'Средний', 'languages': [], 'skills': [], 'traits': [],
        'id': 'custom', 'status': 'undecided', 'source': 'HB',
    }],
    'classes': [],
}

# Mechanics the player fills in from the book (the wizard asks for them).
UNKNOWN_CLASS = {
    'hitDie': None,
    'saves': None,
    'skillChoice': None,
    'proficiencies': None,
    'spellAbility': None,
    'cantrips': None,
    'equipment': [],
}


def merge(kind, existing, groups):
    by_name = {e['key'].lower(): e for e in existing}
    out = []
    seen = set()
    for status, items in groups.items():
        for item in items:
            name = item['en'].lower()
            entry = by_name.get(name)
            if entry is None:
                entry = {'key': item['en'], 'nameRu': item['ru']}
                if kind == 'races':
                    entry.update({'srd': False, 'bonuses': None, 'speed': 30, 'size': 'Средний',
                                  'languages': [], 'skills': [], 'traits': []})
                else:
                    entry.update({'srd': False})
                    entry.update(ARTIFICER if item['en'] == 'Artificer' else UNKNOWN_CLASS)
            else:
                entry = dict(entry)
                entry['srd'] = entry.get('srd', True)
            entry['id'] = item['id']
            entry['status'] = status
            entry['source'] = CLASS_SOURCES.get(item['source'], item['source'])
            entry.pop('unlock', None)
            if item.get('unlock'):
                entry['unlock'] = item['unlock']
            out.append(entry)
            seen.add(entry['key'].lower())
    for extra in EXTRA[kind]:
        kept = by_name.get(extra['key'].lower())
        out.append({**extra, 'status': kept['status']} if kept else dict(extra))
        seen.add(extra['key'].lower())
    missing = [e['key'] for e in existing if e['key'].lower() not in seen]
    if missing:
        raise SystemExit(f'{kind}: in data but not in the GM list: {missing}')
    return out


def main():
    options = json.loads(OPTIONS.read_text(encoding='utf-8'))
    for kind in ('races', 'classes'):
        path = DATA / f'{kind}.json'
        existing = json.loads(path.read_text(encoding='utf-8'))
        merged = merge(kind, existing, options[kind])
        path.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        counts = {}
        for e in merged:
            counts[e['status']] = counts.get(e['status'], 0) + 1
        print(kind, len(merged), counts)


if __name__ == '__main__':
    main()
