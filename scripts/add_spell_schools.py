"""Adds `school` to every spell in backend/src/main/resources/spells.json
and drops the old `pattern` field (magic v2, docs/zlatopryady/magic-v2.md).

Schools follow SRD 5.1 (2014 rules). Spells outside the SRD (Xanathar's,
Tasha's and later) use the school printed in their own book; they and the
spells whose school changed in later printings are listed in DOUBTFUL.
Re-running is safe.

Usage (from the repo root):
    python -I scripts/add_spell_schools.py
"""
import json
from pathlib import Path

SPELLS = Path(__file__).resolve().parent.parent / 'backend' / 'src' / 'main' / 'resources' / 'spells.json'

A, C, D, E, V, I, N, T = ('abjuration', 'conjuration', 'divination', 'enchantment',
                          'evocation', 'illusion', 'necromancy', 'transmutation')

SCHOOL = {
    # Cantrips
    'fire-bolt': V, 'ray-of-frost': V, 'mage-hand': C, 'minor-illusion': I, 'acid-splash': C,
    'blade-ward': A, 'chill-touch': N, 'dancing-lights': V, 'druidcraft': T, 'friends': E,
    'guidance': D, 'light': V, 'mending': T, 'message': T, 'poison-spray': C,
    'prestidigitation': T, 'produce-flame': C, 'resistance': A, 'sacred-flame': V,
    'shillelagh': T, 'shocking-grasp': V, 'spare-the-dying': N, 'thaumaturgy': T,
    'thorn-whip': T, 'true-strike': D, 'vicious-mockery': E,
    'sword-burst': C, 'booming-blade': V, 'green-flame-blade': V, 'lightning-lure': V,
    'mind-sliver': E,
    # 1st
    'burning-hands': V, 'cure-wounds': V, 'shield': A, 'alarm': A, 'animal-friendship': E,
    'bane': E, 'bless': E, 'charm-person': E, 'chromatic-orb': V, 'color-spray': I,
    'command': E, 'comprehend-languages': D, 'compelled-duel': E, 'create-or-destroy-water': T,
    'detect-evil-and-good': D, 'detect-magic': D, 'detect-poison-and-disease': D,
    'disguise-self': I, 'dissonant-whispers': E, 'divine-favor': V, 'entangle': C,
    'ensnaring-strike': C, 'expeditious-retreat': T, 'faerie-fire': V, 'false-life': N,
    'feather-fall': T, 'find-familiar': C, 'fog-cloud': C, 'goodberry': T, 'grease': C,
    'guiding-bolt': V, 'hail-of-thorns': C, 'healing-word': V, 'hellish-rebuke': V,
    'heroism': E, 'hex': E, 'hunters-mark': D, 'identify': D, 'illusory-script': I,
    'inflict-wounds': N, 'jump': T, 'longstrider': T, 'mage-armor': A, 'magic-missile': V,
    'protection-from-evil-and-good': A, 'purify-food-and-drink': T, 'ray-of-sickness': N,
    'sanctuary': A, 'searing-smite': V, 'shield-of-faith': A, 'silent-image': I, 'sleep': E,
    'speak-with-animals': D, 'tashas-hideous-laughter': E, 'tensers-floating-disk': C,
    'thunderous-smite': V, 'thunderwave': V, 'unseen-servant': C, 'witch-bolt': V,
    'wrathful-smite': V, 'tashas-caustic-brew': V,
    # 2nd
    'scorching-ray': V, 'web': C, 'acid-arrow': V, 'aid': A, 'alter-self': T,
    'animal-messenger': E, 'arcane-lock': A, 'augury': D, 'barkskin': T, 'beast-sense': D,
    'blindness-deafness': N, 'blur': I, 'branding-smite': V, 'calm-emotions': E,
    'cloud-of-daggers': C, 'continual-flame': V, 'cordon-of-arrows': T, 'crown-of-madness': E,
    'darkness': V, 'darkvision': T, 'detect-thoughts': D, 'enhance-ability': T,
    'enlarge-reduce': T, 'enthrall': E, 'find-steed': C, 'find-traps': D, 'flame-blade': V,
    'flaming-sphere': C, 'gentle-repose': N, 'gust-of-wind': V, 'heat-metal': T,
    'hold-person': E, 'invisibility': I, 'knock': T, 'lesser-restoration': A, 'levitate': T,
    'locate-animals-or-plants': D, 'locate-object': D, 'magic-mouth': I, 'magic-weapon': T,
    'mirror-image': I, 'misty-step': C, 'moonbeam': V, 'pass-without-trace': A,
    'phantasmal-force': I, 'prayer-of-healing': V, 'protection-from-poison': A,
    'ray-of-enfeeblement': N, 'rope-trick': T, 'see-invisibility': D, 'shatter': V,
    'silence': I, 'spider-climb': T, 'spike-growth': T, 'spiritual-weapon': V,
    'suggestion': E, 'warding-bond': A, 'zone-of-truth': E,
    'summon-beast': C, 'tashas-mind-whip': E,
    # 3rd
    'fireball': V, 'animate-dead': N, 'aura-of-vitality': V, 'beacon-of-hope': A,
    'bestow-curse': N, 'blinding-smite': V, 'call-lightning': C, 'clairvoyance': D,
    'conjure-animals': C, 'conjure-barrage': C, 'counterspell': A, 'create-food-and-water': C,
    'crusaders-mantle': V, 'daylight': V, 'dispel-magic': A, 'elemental-weapon': T,
    'fear': I, 'feign-death': N, 'fly': T, 'gaseous-form': T, 'glyph-of-warding': A,
    'haste': T, 'hunger-of-hadar': C, 'hypnotic-pattern': I, 'leomunds-tiny-hut': V,
    'lightning-arrow': T, 'lightning-bolt': V, 'magic-circle': A, 'major-image': I,
    'mass-healing-word': V, 'meld-into-stone': T, 'nondetection': A, 'phantom-steed': I,
    'plant-growth': T, 'protection-from-energy': A, 'remove-curse': A, 'revivify': N,
    'sending': V, 'sleet-storm': C, 'speak-with-dead': N, 'speak-with-plants': T,
    'spirit-guardians': C, 'stinking-cloud': C, 'tongues': D, 'vampiric-touch': N,
    'water-breathing': T, 'water-walk': T, 'wind-wall': V,
    'intellect-fortress': A, 'spirit-shroud': N, 'summon-undead': N,
    'summon-shadowspawn': C, 'summon-fey': C,
    # 4th
    'ice-storm': V, 'arcane-eye': D, 'aura-of-life': A, 'aura-of-purity': A, 'banishment': A,
    'blight': N, 'compulsion': E, 'confusion': E, 'conjure-minor-elementals': C,
    'conjure-woodland-beings': C, 'control-water': T, 'death-ward': A, 'destructive-wave': V,
    'dimension-door': C, 'divination': D, 'dominate-beast': E, 'evards-black-tentacles': C,
    'fabricate': T, 'fire-shield': V, 'freedom-of-movement': A, 'giant-insect': T,
    'grasping-vine': C, 'guardian-of-faith': C, 'hallucinatory-terrain': I,
    'locate-creature': D, 'mordenkainens-faithful-hound': C, 'otilukes-resilient-sphere': V,
    'phantasmal-killer': I, 'polymorph': T, 'staggering-smite': V, 'stone-shape': T,
    'stoneskin': A, 'wall-of-fire': V,
    'summon-aberration': C, 'summon-construct': C, 'summon-elemental': C,
    # 5th
    'cone-of-cold': V, 'animate-objects': T, 'antilife-shell': A, 'awaken': T,
    'banishing-smite': A, 'circle-of-power': A, 'cloudkill': C, 'commune': D,
    'commune-with-nature': D, 'conjure-elemental': C, 'contact-other-plane': D,
    'contagion': N, 'creation': I, 'dispel-evil-and-good': A, 'dominate-person': E,
    'dream': I, 'flame-strike': V, 'geas': E, 'greater-restoration': A, 'hallow': V,
    'hold-monster': E, 'insect-plague': C, 'legend-lore': D, 'mass-cure-wounds': V,
    'mislead': I, 'modify-memory': E, 'passwall': T, 'planar-binding': A, 'raise-dead': N,
    'rarys-telepathic-bond': D, 'reincarnate': T, 'scrying': D, 'seeming': I,
    'swift-quiver': T, 'telekinesis': T, 'teleportation-circle': C, 'tree-stride': C,
    'wall-of-force': V, 'wall-of-stone': V,
    'summon-celestial': C,
    # 6th
    'chain-lightning': V, 'sunburst': V, 'arcane-gate': C, 'blade-barrier': V,
    'circle-of-death': N, 'conjure-fey': C, 'contingency': V, 'create-undead': N,
    'disintegrate': T, 'drawmijs-instant-summons': C, 'eyebite': N, 'find-the-path': D,
    'flesh-to-stone': T, 'forbiddance': A, 'globe-of-invulnerability': A,
    'guards-and-wards': A, 'harm': N, 'heal': V, 'heroes-feast': C, 'mass-suggestion': E,
    'move-earth': T, 'otilukes-freezing-sphere': V, 'ottos-irresistible-dance': E,
    'planar-ally': C, 'programmed-illusion': I, 'sunbeam': V, 'transport-via-plants': C,
    'true-seeing': D, 'wall-of-ice': V, 'wind-walk': T, 'word-of-recall': C,
    'summon-fiend': C, 'dream-of-the-blue-veil': C,
    # 7th
    'delayed-blast-fireball': V, 'conjure-celestial': C, 'divine-word': V,
    'etherealness': T, 'finger-of-death': N, 'fire-storm': V, 'forcecage': V,
    'mordenkainens-magnificent-mansion': C, 'mirage-arcane': I, 'mordenkainens-sword': V,
    'plane-shift': C, 'prismatic-spray': V, 'project-image': I, 'regenerate': T,
    'resurrection': N, 'reverse-gravity': T, 'sequester': T, 'simulacrum': I, 'symbol': A,
    'teleport': C,
    # 8th
    'animal-shapes': T, 'antimagic-field': A, 'antipathy-sympathy': E, 'clone': N,
    'control-weather': T, 'demiplane': C, 'dominate-monster': E, 'earthquake': V,
    'feeblemind': E, 'glibness': T, 'holy-aura': A, 'incendiary-cloud': C, 'maze': C,
    'mind-blank': A, 'power-word-stun': E, 'telepathy': V, 'tsunami': C,
}

# Not in SRD 5.1 (school from the spell's own book), or the school differs
# between printings. Listed in the stage 6 report for the GM to check.
DOUBTFUL = {
    'sword-burst': 'Sword Coast Adventurer\'s Guide / Tasha\'s, не SRD',
    'booming-blade': 'Tasha\'s, не SRD',
    'green-flame-blade': 'Tasha\'s, не SRD',
    'lightning-lure': 'Tasha\'s, не SRD',
    'mind-sliver': 'Tasha\'s, не SRD',
    'tashas-caustic-brew': 'Tasha\'s, не SRD',
    'tashas-mind-whip': 'Tasha\'s, не SRD',
    'intellect-fortress': 'Tasha\'s, не SRD',
    'spirit-shroud': 'Tasha\'s, не SRD',
    'dream-of-the-blue-veil': 'Tasha\'s, не SRD',
    'summon-*': 'Tasha\'s, не SRD: все призывы — вызов, кроме «Призыва нежити» (некромантия)',
    'compelled-duel': 'не SRD (PHB)',
    'ensnaring-strike': 'не SRD (PHB)',
    'hail-of-thorns': 'не SRD (PHB)',
    'hex': 'не SRD (PHB)',
    'hunters-mark': 'не SRD (PHB)',
    'searing-smite': 'не SRD (PHB)',
    'thunderous-smite': 'не SRD (PHB)',
    'wrathful-smite': 'не SRD (PHB); в правилах 2024 — некромантия',
    'staggering-smite': 'не SRD (PHB); в правилах 2024 — очарование',
    'cure-wounds': 'SRD 5.1 — воплощение; в правилах 2024 — ограждение',
    'healing-word': 'SRD 5.1 — воплощение; в правилах 2024 — ограждение',
    'mass-cure-wounds': 'SRD 5.1 — воплощение; в правилах 2024 — ограждение',
    'mass-healing-word': 'SRD 5.1 — воплощение; в правилах 2024 — ограждение',
    'prayer-of-healing': 'SRD 5.1 — воплощение; в правилах 2024 — ограждение',
    'heal': 'SRD 5.1 — воплощение; в правилах 2024 — ограждение',
    'telepathy': 'SRD 5.1 — воплощение (несмотря на смысл)',
    'true-strike': 'SRD 5.1 — прорицание',
}


def main():
    spells = json.loads(SPELLS.read_text(encoding='utf-8'))
    missing = [s['id'] for s in spells if s['id'] not in SCHOOL]
    if missing:
        raise SystemExit(f'no school for: {missing}')
    for s in spells:
        s['school'] = SCHOOL[s['id']]
        s.pop('pattern', None)
    SPELLS.write_text(json.dumps(spells, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    counts = {}
    for s in spells:
        counts[s['school']] = counts.get(s['school'], 0) + 1
    print(len(spells), counts)


if __name__ == '__main__':
    main()
