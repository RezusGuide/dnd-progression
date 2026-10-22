package com.backend.research;

import java.util.ArrayList;
import java.util.List;

/**
 * A cell of the research grid in axial coordinates; (0, 0) is the centre.
 * The grid of radius R holds every cell at most R steps from the centre.
 */
public record Hex(int q, int r) {

    private static final int[][] DIRECTIONS = {{1, 0}, {1, -1}, {0, -1}, {-1, 0}, {-1, 1}, {0, 1}};

    public int distance(Hex other) {
        int dq = q - other.q;
        int dr = r - other.r;
        return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
    }

    public List<Hex> neighbours() {
        List<Hex> out = new ArrayList<>(6);
        for (int[] d : DIRECTIONS) out.add(new Hex(q + d[0], r + d[1]));
        return out;
    }

    public boolean inGrid(int radius) {
        return distance(new Hex(0, 0)) <= radius;
    }

    /** Every cell of the grid, row by row (stable order). */
    public static List<Hex> grid(int radius) {
        List<Hex> out = new ArrayList<>();
        for (int r = -radius; r <= radius; r++) {
            for (int q = -radius; q <= radius; q++) {
                Hex h = new Hex(q, r);
                if (h.inGrid(radius)) out.add(h);
            }
        }
        return out;
    }
}
