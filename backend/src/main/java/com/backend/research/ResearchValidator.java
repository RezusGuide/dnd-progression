package com.backend.research;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The rule for a correct research note (magic-v2.md, section 4).
 *
 * Every occupied cell (anchor or placed aspect) is a vertex; two neighbouring
 * cells share an edge only when their aspects are linked. The note is
 * correct when all anchors are in one connected component and every placed
 * aspect belongs to that component too.
 *
 * The frontend (lib/research.js) runs the same check for highlighting; the
 * tests on both sides cover the same cases.
 */
public final class ResearchValidator {

    /** Why a grid cannot even be checked; null in a well-formed grid. */
    public enum Problem { OUTSIDE_GRID, ON_ANCHOR, TWICE_IN_A_CELL, UNKNOWN_ASPECT }

    /**
     * @param main      cells of the component with the most anchors (anchors included)
     * @param dangling  placed cells in a component without any anchor
     * @param detached  placed cells joined to an anchor outside the main component
     * @param anchorsConnected anchors in the main component, 0 while no two are joined
     */
    public record Result(boolean valid, Problem problem, int anchorsConnected, int anchorsTotal,
                         Set<Hex> main, Set<Hex> dangling, Set<Hex> detached, List<Hex[]> edges) {
    }

    private ResearchValidator() {
    }

    public static Result validate(AspectGraph graph, int radius, List<Placement> anchors, List<Placement> placed) {
        Map<Hex, String> cells = new LinkedHashMap<>();
        Set<Hex> anchorCells = new LinkedHashSet<>();
        for (Placement a : anchors) {
            cells.put(a.hex(), a.aspect());
            anchorCells.add(a.hex());
        }
        Problem problem = null;
        for (Placement p : placed) {
            Hex h = p.hex();
            if (!h.inGrid(radius)) problem = Problem.OUTSIDE_GRID;
            else if (anchorCells.contains(h)) problem = Problem.ON_ANCHOR;
            else if (cells.containsKey(h)) problem = Problem.TWICE_IN_A_CELL;
            else if (!graph.contains(p.aspect())) problem = Problem.UNKNOWN_ASPECT;
            if (problem != null) {
                return new Result(false, problem, 0, anchors.size(), Set.of(), Set.of(), Set.of(), List.of());
            }
            cells.put(h, p.aspect());
        }

        // Edges between linked neighbours, each once.
        List<Hex[]> edges = new ArrayList<>();
        Map<Hex, List<Hex>> adjacent = new HashMap<>();
        for (Map.Entry<Hex, String> e : cells.entrySet()) {
            for (Hex n : e.getKey().neighbours()) {
                String other = cells.get(n);
                if (other != null && graph.linked(e.getValue(), other)) {
                    adjacent.computeIfAbsent(e.getKey(), k -> new ArrayList<>()).add(n);
                    if (compare(e.getKey(), n) < 0) edges.add(new Hex[]{e.getKey(), n});
                }
            }
        }

        // Connected components; the main one has the most anchors (the
        // first anchor in order wins a tie).
        Set<Hex> main = Set.of();
        int mainAnchors = -1;
        Set<Hex> dangling = new LinkedHashSet<>();
        Set<Hex> detached = new LinkedHashSet<>();
        List<Set<Hex>> anchored = new ArrayList<>();
        Set<Hex> seen = new HashSet<>();
        for (Hex start : cells.keySet()) {
            if (!seen.add(start)) continue;
            Set<Hex> component = new LinkedHashSet<>();
            Deque<Hex> queue = new ArrayDeque<>(List.of(start));
            component.add(start);
            while (!queue.isEmpty()) {
                for (Hex n : adjacent.getOrDefault(queue.poll(), List.of())) {
                    if (seen.add(n)) {
                        component.add(n);
                        queue.add(n);
                    }
                }
            }
            int count = (int) component.stream().filter(anchorCells::contains).count();
            if (count == 0) {
                dangling.addAll(component);
            } else {
                anchored.add(component);
                if (count > mainAnchors) {
                    mainAnchors = count;
                    main = component;
                }
            }
        }
        for (Set<Hex> component : anchored) {
            if (component != main) {
                component.stream().filter(h -> !anchorCells.contains(h)).forEach(detached::add);
            }
        }

        boolean valid = mainAnchors == anchors.size() && dangling.isEmpty() && detached.isEmpty();
        int connected = mainAnchors >= 2 ? mainAnchors : 0;
        return new Result(valid, null, connected, anchors.size(), main, dangling, detached, edges);
    }

    private static int compare(Hex a, Hex b) {
        return a.q() != b.q() ? Integer.compare(a.q(), b.q()) : Integer.compare(a.r(), b.r());
    }
}
