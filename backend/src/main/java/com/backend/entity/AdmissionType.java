package com.backend.entity;

/** What an admission request asks the GM for. */
public enum AdmissionType {
    /** A new character file waiting for approval. */
    CREATION,
    /** A level-up, possibly above the rune cap (then it is also a clearance). */
    LEVEL_UP
}
