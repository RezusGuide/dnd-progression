"""Writes data/aspects.json and data/schools.json for "Исследования Санни"
(docs/zlatopryady/magic-v2.md, sections 1-2) and checks every aspect
colour against the night surfaces (at least 3:1 for an icon).

Usage (from the repo root):
    python -I scripts/make_magic_data.py
"""
import json
from pathlib import Path

DATA = Path(__file__).resolve().parent.parent / 'backend' / 'src' / 'main' / 'resources' / 'data'

# key, nameRu, components, colour, hint
ASPECTS = [
    ('dawn', 'Рассвет', [], '#F4B63D', 'Свет, огонь, жизнь.'),
    ('shadow', 'Тень', [], '#9A8BC4', 'Тьма, скрытность, смерть.'),
    ('steam', 'Пар', [], '#9FB3C8', 'Материя, механизм, движение.'),
    ('dream', 'Сон', [], '#B39DDB', 'Разум, иллюзия, чары.'),
    ('order', 'Порядок', [], '#4FA3A5', 'Руна, защита, закон.'),
    ('rift', 'Разлом', [], '#D9577E', 'Хаос, планы, дикая магия.'),
    ('gear', 'Шестерня', ['order', 'steam'], '#C9A86A', 'Устройство, сборка, точность.'),
    ('mirage', 'Мираж', ['dream', 'dawn'], '#F2C6DE', 'Видимость, обман зрения.'),
    ('flame', 'Пламя', ['dawn', 'steam'], '#F28C4B', 'Жар, горение, сила.'),
    ('ward', 'Оберег', ['order', 'dawn'], '#8FD3C1', 'Защита, щит, граница.'),
    ('decay', 'Тлен', ['shadow', 'rift'], '#A3B86C', 'Распад, яд, увядание.'),
    ('fog', 'Туман', ['steam', 'shadow'], '#B7C2CF', 'Сокрытие, пелена, сырость.'),
    ('portal', 'Врата', ['rift', 'order'], '#6FA8FF', 'Переход, призыв, путь.'),
    ('nightmare', 'Кошмар', ['dream', 'shadow'], '#C77DDB', 'Страх, морок, наваждение.'),
    ('oracle', 'Прозрение', ['dream', 'order'], '#7FD1F0', 'Знание, взгляд сквозь.'),
    ('storm', 'Буря', ['rift', 'steam'], '#8FB8FF', 'Ветер, молния, гром.'),
    ('essence', 'Эссенция', ['dream', 'rift'], '#E3A6FF', 'Суть, сердцевина чар.'),
    ('life', 'Жизнь', ['dawn', 'decay'], '#7FD48A', 'Рост, исцеление, дыхание.'),
    ('machine', 'Механизм', ['gear', 'steam'], '#D4B48C', 'Движущееся устройство.'),
]

SCHOOLS = [
    ('abjuration', 'Ограждение', ['order', 'ward', 'gear', 'dawn']),
    ('conjuration', 'Вызов', ['portal', 'rift', 'steam', 'machine']),
    ('divination', 'Прорицание', ['oracle', 'dream', 'order', 'dawn']),
    ('enchantment', 'Очарование', ['dream', 'mirage', 'nightmare', 'order']),
    ('evocation', 'Воплощение', ['dawn', 'rift', 'flame', 'storm']),
    ('illusion', 'Иллюзия', ['mirage', 'fog', 'dream', 'shadow']),
    ('necromancy', 'Некромантия', ['shadow', 'decay', 'life', 'nightmare']),
    ('transmutation', 'Преобразование', ['steam', 'machine', 'gear', 'life', 'essence']),
]

NIGHT = {'page': '#12203A', 'card': '#1C2E4F', 'sunken': '#0C1629'}


def luminance(hex_colour):
    rgb = [int(hex_colour[i:i + 2], 16) / 255 for i in (1, 3, 5)]
    lin = [c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4 for c in rgb]
    return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2]


def contrast(a, b):
    la, lb = sorted((luminance(a), luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def main():
    keys = {a[0] for a in ASPECTS}
    aspects = []
    worst = []
    for key, name, comps, colour, hint in ASPECTS:
        assert all(c in keys for c in comps), key
        ratio = min(contrast(colour, bg) for bg in NIGHT.values())
        worst.append((ratio, key))
        assert ratio >= 3, f'{key} {colour}: {ratio:.2f}'
        aspects.append({'key': key, 'nameRu': name, 'primal': not comps, 'components': comps,
                        'color': colour, 'glyph': key, 'hint': hint})
    for key, name, school_aspects in SCHOOLS:
        assert len(school_aspects) >= 4 and all(a in keys for a in school_aspects), key
    out = {'starterKitPerPrimal': 3, 'aspects': aspects}
    (DATA / 'aspects.json').write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    schools = [{'key': k, 'nameRu': n, 'aspects': a} for k, n, a in SCHOOLS]
    (DATA / 'schools.json').write_text(json.dumps(schools, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    worst.sort()
    print('lowest contrast on night surfaces:', ', '.join(f'{k} {r:.2f}' for r, k in worst[:5]))


if __name__ == '__main__':
    main()
