package com.backend.research;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Test helper: builds one correct solution for a topic, joining the anchors
 * one by one with a breadth-first search over (cell, aspect). Proves that
 * every generated topic can actually be solved on its grid.
 */
final class ResearchSolver {

    private record State(Hex hex, String aspect) {
    }

    private ResearchSolver() {
    }

    /** Placed aspects of a correct solution, or null if none was found. */
    static List<Placement> solve(AspectGraph graph, ResearchTopicGenerator.Topic topic) {
        Map<Hex, String> occupied = new LinkedHashMap<>();
        topic.anchors().forEach(a -> occupied.put(a.hex(), a.aspect()));
        Map<Hex, String> component = new LinkedHashMap<>();
        Placement first = topic.anchors().get(0);
        component.put(first.hex(), first.aspect());
        List<Placement> placed = new ArrayList<>();

        for (Placement target : topic.anchors().subList(1, topic.anchors().size())) {
            List<State> path = connect(graph, topic.radius(), occupied, component, target);
            if (path == null) return null;
            for (State s : path) {
                occupied.put(s.hex(), s.aspect());
                component.put(s.hex(), s.aspect());
                placed.add(new Placement(s.hex().q(), s.hex().r(), s.aspect()));
            }
            component.put(target.hex(), target.aspect());
        }
        return placed;
    }

    // Shortest chain of new cells from the current component to the target.
    private static List<State> connect(AspectGraph graph, int radius, Map<Hex, String> occupied,
                                       Map<Hex, String> component, Placement target) {
        // Already touching?
        for (Map.Entry<Hex, String> c : component.entrySet()) {
            if (c.getKey().distance(target.hex()) == 1 && graph.linked(c.getValue(), target.aspect())) return List.of();
        }
        Map<State, State> parent = new HashMap<>();
        Deque<State> queue = new ArrayDeque<>();
        for (Map.Entry<Hex, String> c : component.entrySet()) {
            for (Hex n : c.getKey().neighbours()) {
                if (!n.inGrid(radius) || occupied.containsKey(n)) continue;
                for (String a : graph.linkedTo(c.getValue())) {
                    State s = new State(n, a);
                    if (parent.putIfAbsent(s, s) == null) queue.add(s);
                }
            }
        }
        while (!queue.isEmpty()) {
            State cur = queue.poll();
            if (cur.hex().distance(target.hex()) == 1 && graph.linked(cur.aspect(), target.aspect())) {
                List<State> path = new ArrayList<>();
                for (State s = cur; ; s = parent.get(s)) {
                    path.add(0, s);
                    if (parent.get(s) == s) break;
                }
                // A cell must not be used twice on one chain.
                if (path.stream().map(State::hex).distinct().count() == path.size()) return path;
                continue;
            }
            for (Hex n : cur.hex().neighbours()) {
                if (!n.inGrid(radius) || occupied.containsKey(n)) continue;
                for (String a : graph.linkedTo(cur.aspect())) {
                    State s = new State(n, a);
                    if (!parent.containsKey(s)) {
                        parent.put(s, cur);
                        queue.add(s);
                    }
                }
            }
        }
        return null;
    }
}
