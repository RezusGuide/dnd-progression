package com.backend.research;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

/**
 * Anchors of a research topic (magic-v2.md, section 3). Everything comes
 * from a seed hashed from the spell id, so every player gets the same
 * anchors on every attempt.
 *
 * - grid radius 4 for spell levels 1-5, 5 for 6-9;
 * - anchors: 2 for levels 1-2, 3 for 3-5, 4 for 6-9;
 * - anchor aspects: different ones from the spell school's set;
 * - any two anchors at least 3 / 4 / 5 cells apart.
 */
public final class ResearchTopicGenerator {

    private static final int ATTEMPTS = 200;

    public record Topic(int radius, List<Placement> anchors) {
    }

    private ResearchTopicGenerator() {
    }

    public static int radiusFor(int spellLevel) {
        return spellLevel >= 6 ? 5 : 4;
    }

    public static int anchorCount(int spellLevel) {
        return spellLevel >= 6 ? 4 : spellLevel >= 3 ? 3 : 2;
    }

    public static int minDistance(int spellLevel) {
        return spellLevel >= 6 ? 5 : spellLevel >= 3 ? 4 : 3;
    }

    public static Topic generate(String spellId, int spellLevel, List<String> schoolAspects) {
        int count = anchorCount(spellLevel);
        if (schoolAspects.size() < count) {
            throw new IllegalArgumentException("School has fewer aspects than anchors: " + spellId);
        }
        SplitMix rng = new SplitMix(fnv1a(spellId));

        List<String> aspects = new ArrayList<>(schoolAspects);
        shuffle(aspects, rng);
        aspects = aspects.subList(0, count);

        int radius = radiusFor(spellLevel);
        int gap = minDistance(spellLevel);
        for (int attempt = 0; attempt < ATTEMPTS; attempt++) {
            List<Hex> cells = new ArrayList<>(Hex.grid(radius));
            shuffle(cells, rng);
            List<Hex> picked = new ArrayList<>();
            for (Hex cell : cells) {
                if (picked.stream().allMatch(p -> p.distance(cell) >= gap)) picked.add(cell);
                if (picked.size() == count) break;
            }
            if (picked.size() == count) {
                List<Placement> anchors = new ArrayList<>();
                for (int i = 0; i < count; i++) {
                    anchors.add(new Placement(picked.get(i).q(), picked.get(i).r(), aspects.get(i)));
                }
                return new Topic(radius, List.copyOf(anchors));
            }
        }
        throw new IllegalStateException("Could not place anchors for " + spellId);
    }

    // FNV-1a, 64 bit: a stable hash that does not depend on the JVM.
    static long fnv1a(String s) {
        long h = 0xcbf29ce484222325L;
        for (byte b : s.getBytes(StandardCharsets.UTF_8)) {
            h ^= (b & 0xff);
            h *= 0x100000001b3L;
        }
        return h;
    }

    private static <T> void shuffle(List<T> list, SplitMix rng) {
        for (int i = list.size() - 1; i > 0; i--) {
            int j = rng.nextInt(i + 1);
            T tmp = list.get(i);
            list.set(i, list.get(j));
            list.set(j, tmp);
        }
    }

    // SplitMix64, written out so the sequence never changes with the JDK.
    private static final class SplitMix {
        private long state;

        SplitMix(long seed) {
            this.state = seed;
        }

        long next() {
            long z = (state += 0x9E3779B97F4A7C15L);
            z = (z ^ (z >>> 30)) * 0xBF58476D1CE4E5B9L;
            z = (z ^ (z >>> 27)) * 0x94D049BB133111EBL;
            return z ^ (z >>> 31);
        }

        int nextInt(int bound) {
            return (int) Math.floorMod(next(), (long) bound);
        }
    }
}
