"""Add Russian casting time / range / duration / components to spells.json.

Writes castingTimeRu, rangeRu, durationRu and componentsRu next to the
English fields. Pattern rules cover the common phrasings; everything else
is in the EXACT table (translated by hand). Re-running is safe: the *Ru
fields are recomputed from the English ones every time.

Usage (from the repo root):
    python -I scripts/translate_spell_meta.py
Exits with code 1 and lists anything it could not translate.
"""
import json
import re
import sys
from pathlib import Path

SPELLS = Path(__file__).resolve().parent.parent / 'backend' / 'src' / 'main' / 'resources' / 'spells.json'


def plural(n, one, few, many):
    n = abs(int(n))
    if n % 10 == 1 and n % 100 != 11:
        return one
    if 2 <= n % 10 <= 4 and not 12 <= n % 100 <= 14:
        return few
    return many


UNITS = {
    'action': ('действие', 'действия', 'действий'),
    'bonus action': ('бонусное действие', 'бонусных действия', 'бонусных действий'),
    'reaction': ('реакция', 'реакции', 'реакций'),
    'round': ('раунд', 'раунда', 'раундов'),
    'minute': ('минута', 'минуты', 'минут'),
    'hour': ('час', 'часа', 'часов'),
    'day': ('день', 'дня', 'дней'),
    'mile': ('миля', 'мили', 'миль'),
}

# Genitive after "до" ("концентрация, до 1 минуты").
UNITS_GEN = {
    'round': ('раунда', 'раундов', 'раундов'),
    'minute': ('минуты', 'минут', 'минут'),
    'hour': ('часа', 'часов', 'часов'),
    'day': ('дня', 'дней', 'дней'),
}


def amount(text, table=UNITS):
    m = re.fullmatch(r'(\d+) (bonus action|action|reaction|round|minute|hour|day|mile)s?', text)
    if not m:
        return None
    n, unit = m.group(1), m.group(2)
    return f'{n} {plural(n, *table[unit])}'


def feet(n):
    return f'{n} фт'


EXACT = {
    'Self': 'на себя',
    'Touch': 'касание',
    'Sight': 'в пределах видимости',
    'Special': 'особая',
    'Unlimited': 'без ограничений',
    'Instantaneous': 'мгновенная',
    'Until destroyed': 'пока не уничтожено',
    'Until dispelled': 'пока не рассеется',
    '1 action or 8 hours': '1 действие или 8 часов',
}

SHAPES = {
    'radius': 'радиус',
    'cone': 'конус',
    'cube': 'куб',
    'line': 'линия',
}


def translate_time(text):
    if text in EXACT:
        return EXACT[text]
    m = re.fullmatch(r'(.+) \(ritual\)', text)
    if m:
        base = translate_time(m.group(1))
        return f'{base} (ритуал)' if base else None
    return amount(text)


def translate_range(text):
    if text in EXACT:
        return EXACT[text]
    m = re.fullmatch(r'(\d+) feet', text)
    if m:
        return feet(m.group(1))
    m = re.fullmatch(r'(\d+) miles?', text)
    if m:
        return amount(f'{m.group(1)} mile')
    m = re.fullmatch(r'Self \((\d+)-(foot|mile) (radius|cone|cube|line)\)', text)
    if m:
        size = feet(m.group(1)) if m.group(2) == 'foot' else amount(f'{m.group(1)} mile')
        return f'на себя ({SHAPES[m.group(3)]} {size})'
    m = re.fullmatch(r'Self \((\d+) feet\)', text)
    if m:
        return f'на себя ({feet(m.group(1))})'
    return None


def translate_duration(text):
    if text in EXACT:
        return EXACT[text]
    m = re.fullmatch(r'Concentration, up to (\d+) (round|minute|hour|day)s?', text)
    if m:
        n = m.group(1)
        return f'концентрация, до {n} {plural(n, *UNITS_GEN[m.group(2)])}'
    m = re.fullmatch(r'Up to (\d+) (round|minute|hour|day)s?', text)
    if m:
        n = m.group(1)
        return f'до {n} {plural(n, *UNITS_GEN[m.group(2)])}'
    return amount(text)


def translate_components(text):
    if not text:
        return None
    letters = {'V': 'В', 'S': 'С', 'M': 'М'}
    parts = [p.strip() for p in text.split(',')]
    if all(p in letters for p in parts):
        return ', '.join(letters[p] for p in parts)
    return None


FIELDS = [
    ('castingTime', 'castingTimeRu', translate_time),
    ('range', 'rangeRu', translate_range),
    ('duration', 'durationRu', translate_duration),
    ('components', 'componentsRu', translate_components),
]


def main():
    spells = json.loads(SPELLS.read_text(encoding='utf-8'))
    missing = set()
    out = []
    for spell in spells:
        row = {}
        for key, value in spell.items():
            if key.endswith('Ru') and key in {f[1] for f in FIELDS}:
                continue  # recomputed below
            row[key] = value
            for src, dst, fn in FIELDS:
                if key == src and value:
                    ru = fn(value)
                    if ru:
                        row[dst] = ru
                    else:
                        missing.add(f'{src}: {value}')
        out.append(row)
    SPELLS.write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    if missing:
        print('Not translated:', *sorted(missing), sep='\n  ')
        sys.exit(1)
    print(f'OK: {len(out)} spells')


if __name__ == '__main__':
    main()
