package com.backend.research;

import com.backend.research.SpellAccess.CasterType;
import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;

// Stage 6 core: aspect links, anchors, the solution rule and spell access.
// Plain JUnit on the real data files, no Spring.
class ResearchCoreTests {

    private final AspectGraph graph = MagicDataFixture.graph();
    private final Map<String, List<String>> schools = MagicDataFixture.schools();

    // ── Aspect graph ──

    @Test
    void graphIsConnectedAndHasNineteenAspects() {
        assertEquals(19, graph.keys().size());
        assertTrue(graph.isConnected());
    }

    @Test
    void linksFollowRecipesAndNeverTheSameAspect() {
        assertTrue(graph.linked("gear", "order"));
        assertTrue(graph.linked("steam", "gear"));
        assertTrue(graph.linked("machine", "gear"));
        assertTrue(graph.linked("life", "decay"));
        assertFalse(graph.linked("dawn", "shadow"));
        assertFalse(graph.linked("dawn", "dawn"));
        assertFalse(graph.linked("gear", "gear"));
    }

    // ── Anchors ──

    @Test
    void everySpellGetsSolvableAnchorsWithinTheRules() {
        int topics = 0;
        for (JsonNode spell : MagicDataFixture.spells()) {
            int level = spell.get("level").asInt();
            if (level == 0) continue;
            String id = spell.get("id").asText();
            List<String> school = schools.get(spell.get("school").asText());
            assertNotNull(school, id);

            ResearchTopicGenerator.Topic topic = ResearchTopicGenerator.generate(id, level, school);
            List<Placement> anchors = topic.anchors();
            assertEquals(ResearchTopicGenerator.anchorCount(level), anchors.size(), id);
            assertEquals(level >= 6 ? 5 : 4, topic.radius(), id);

            Set<String> aspects = new HashSet<>();
            for (Placement a : anchors) {
                assertTrue(a.hex().inGrid(topic.radius()), id);
                assertTrue(school.contains(a.aspect()), id);
                aspects.add(a.aspect());
            }
            assertEquals(anchors.size(), aspects.size(), id + ": anchor aspects differ");

            for (int i = 0; i < anchors.size(); i++) {
                for (int j = i + 1; j < anchors.size(); j++) {
                    assertTrue(anchors.get(i).hex().distance(anchors.get(j).hex()) >= ResearchTopicGenerator.minDistance(level), id);
                    assertTrue(graph.pathLength(anchors.get(i).aspect(), anchors.get(j).aspect()) > 0, id);
                }
            }

            // A real solution exists on this grid.
            List<Placement> solution = ResearchSolver.solve(graph, topic);
            assertNotNull(solution, id + ": no solution found");
            assertTrue(ResearchValidator.validate(graph, topic.radius(), anchors, solution).valid(), id);
            topics++;
        }
        assertEquals(320, topics);
    }

    @Test
    void sameSpellIdGivesTheSameAnchors() {
        List<String> evocation = schools.get("evocation");
        assertEquals(ResearchTopicGenerator.generate("magic-missile", 1, evocation),
                ResearchTopicGenerator.generate("magic-missile", 1, evocation));
        assertNotEquals(ResearchTopicGenerator.generate("magic-missile", 1, evocation),
                ResearchTopicGenerator.generate("burning-hands", 1, evocation));
    }

    // ── Validator ──

    // Two anchors three cells apart on one row: dawn at (-2,0), storm at (1,0).
    private final List<Placement> anchors = List.of(new Placement(-2, 0, "dawn"), new Placement(1, 0, "storm"));

    @Test
    void chainOfLinkedAspectsIsCorrect() {
        // dawn - flame - steam - storm
        List<Placement> placed = List.of(new Placement(-1, 0, "flame"), new Placement(0, 0, "steam"));
        ResearchValidator.Result r = ResearchValidator.validate(graph, 4, anchors, placed);
        assertTrue(r.valid());
        assertEquals(2, r.anchorsConnected());
        assertEquals(3, r.edges().size());
    }

    @Test
    void danglingAspectMakesItWrong() {
        List<Placement> placed = List.of(new Placement(-1, 0, "flame"), new Placement(0, 0, "steam"),
                new Placement(3, -3, "gear"));
        ResearchValidator.Result r = ResearchValidator.validate(graph, 4, anchors, placed);
        assertFalse(r.valid());
        assertEquals(2, r.anchorsConnected());
        assertEquals(Set.of(new Hex(3, -3)), r.dangling());
    }

    @Test
    void identicalNeighboursDoNotConnect() {
        // dawn - flame - flame - storm: flame/flame is no link, storm/flame is none either.
        List<Placement> placed = List.of(new Placement(-1, 0, "flame"), new Placement(0, 0, "flame"));
        ResearchValidator.Result r = ResearchValidator.validate(graph, 4, anchors, placed);
        assertFalse(r.valid());
        assertEquals(0, r.anchorsConnected());
        assertTrue(r.edges().size() == 1); // only dawn - flame
    }

    @Test
    void anchorOutsideTheComponentMakesItWrong() {
        List<Placement> three = List.of(anchors.get(0), anchors.get(1), new Placement(0, 3, "order"));
        List<Placement> placed = List.of(new Placement(-1, 0, "flame"), new Placement(0, 0, "steam"));
        ResearchValidator.Result r = ResearchValidator.validate(graph, 4, three, placed);
        assertFalse(r.valid());
        assertEquals(2, r.anchorsConnected());
        assertTrue(r.dangling().isEmpty());
    }

    @Test
    void placingOnAnAnchorOrOutsideIsAProblem() {
        assertEquals(ResearchValidator.Problem.ON_ANCHOR,
                ResearchValidator.validate(graph, 4, anchors, List.of(new Placement(-2, 0, "flame"))).problem());
        assertEquals(ResearchValidator.Problem.OUTSIDE_GRID,
                ResearchValidator.validate(graph, 4, anchors, List.of(new Placement(5, 0, "flame"))).problem());
        assertEquals(ResearchValidator.Problem.UNKNOWN_ASPECT,
                ResearchValidator.validate(graph, 4, anchors, List.of(new Placement(0, 0, "nothing"))).problem());
    }

    // ── Spell access ──

    @Test
    void maxSpellLevelFollowsTheSlotTables() {
        CasterType wizard = SpellAccess.casterType("Wizard");
        assertEquals(1, SpellAccess.maxSpellLevel(wizard, 1));
        assertEquals(2, SpellAccess.maxSpellLevel(wizard, 3));
        assertEquals(3, SpellAccess.maxSpellLevel(wizard, 5));

        CasterType paladin = SpellAccess.casterType("Paladin");
        assertEquals(1, SpellAccess.maxSpellLevel(paladin, 2));
        assertEquals(2, SpellAccess.maxSpellLevel(paladin, 5));
        assertEquals(0, SpellAccess.maxSpellLevel(paladin, 1));

        assertEquals(1, SpellAccess.maxSpellLevel(SpellAccess.casterType("Artificer"), 1));
        assertEquals(3, SpellAccess.maxSpellLevel(SpellAccess.casterType("Warlock"), 5));

        assertNull(SpellAccess.casterType("Fighter"));
        assertEquals(5, SpellAccess.levelFor(wizard, 3));
        assertEquals(9, SpellAccess.levelFor(paladin, 3));
    }
}
