package com.backend.research;

/** An aspect on a grid cell: an anchor, or one the player put there. */
public record Placement(int q, int r, String aspect) {

    public Hex hex() {
        return new Hex(q, r);
    }
}
