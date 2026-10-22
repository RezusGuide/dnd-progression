package com.backend.research;

import java.util.ArrayDeque;
import java.util.Collections;
import java.util.Deque;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Links between aspects (magic-v2.md, section 1): A and B are linked when
 * one is in the other's recipe. The same aspect is never linked to itself,
 * otherwise one aspect could fill any chain.
 */
public final class AspectGraph {

    private final Map<String, Set<String>> links = new LinkedHashMap<>();

    /** @param components aspect key -> the two keys it is made of (empty for primal ones) */
    public AspectGraph(Map<String, List<String>> components) {
        components.keySet().forEach(k -> links.put(k, new LinkedHashSet<>()));
        components.forEach((key, parts) -> {
            for (String part : parts) {
                if (!links.containsKey(part)) throw new IllegalArgumentException("Unknown aspect in recipe: " + part);
                if (part.equals(key)) continue;
                links.get(key).add(part);
                links.get(part).add(key);
            }
        });
    }

    public Set<String> keys() {
        return Collections.unmodifiableSet(links.keySet());
    }

    public boolean contains(String aspect) {
        return links.containsKey(aspect);
    }

    public boolean linked(String a, String b) {
        return a != null && !a.equals(b) && links.getOrDefault(a, Set.of()).contains(b);
    }

    public Set<String> linkedTo(String aspect) {
        return Collections.unmodifiableSet(links.getOrDefault(aspect, Set.of()));
    }

    /** Fewest links from a to b, or -1 when there is no path. */
    public int pathLength(String a, String b) {
        if (!links.containsKey(a) || !links.containsKey(b)) return -1;
        Map<String, Integer> dist = new LinkedHashMap<>();
        Deque<String> queue = new ArrayDeque<>();
        dist.put(a, 0);
        queue.add(a);
        while (!queue.isEmpty()) {
            String cur = queue.poll();
            if (cur.equals(b)) return dist.get(cur);
            for (String next : links.get(cur)) {
                if (dist.putIfAbsent(next, dist.get(cur) + 1) == null) queue.add(next);
            }
        }
        return -1;
    }

    /** Every aspect reachable from every other one. */
    public boolean isConnected() {
        if (links.isEmpty()) return true;
        String start = links.keySet().iterator().next();
        Set<String> seen = new HashSet<>();
        Deque<String> queue = new ArrayDeque<>(List.of(start));
        seen.add(start);
        while (!queue.isEmpty()) {
            for (String next : links.get(queue.poll())) {
                if (seen.add(next)) queue.add(next);
            }
        }
        return seen.size() == links.size();
    }
}
