package com.backend.service;

import com.backend.dto.WorldDtos.ArticleInput;
import com.backend.dto.WorldDtos.GmArticle;
import com.backend.dto.WorldDtos.PlayerArticle;
import com.backend.entity.User;
import com.backend.entity.WorldArticle;
import com.backend.entity.WorldArticle.Status;
import com.backend.exception.ApiException;
import com.backend.repository.WorldArticleRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Pattern;

/**
 * «Мир» (docs/zlatopryady/prompts/09-dreams-and-world.md): the encyclopedia.
 * Players get OPEN and REDACTED articles (REDACTED without the body) and
 * never HIDDEN ones or GM notes; the GM edits everything.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WorldService {

    public static final String SEED = "seed/world-seed.json";
    private static final Pattern SLUG = Pattern.compile("[a-z0-9]+(-[a-z0-9]+)*");
    private static final Set<Status> VISIBLE = Set.of(Status.OPEN, Status.REDACTED);

    private final WorldArticleRepository repository;
    private final GmLogService gmLog;
    private final ObjectMapper objectMapper = new ObjectMapper();

    // ── Players ──

    @Transactional(readOnly = true)
    public List<PlayerArticle> list() {
        return repository.findByStatusInOrderByTitleAsc(VISIBLE).stream().map(a -> forPlayer(a, false)).toList();
    }

    @Transactional(readOnly = true)
    public PlayerArticle get(String slug) {
        WorldArticle a = repository.findBySlug(slug)
                .filter(x -> VISIBLE.contains(x.getStatus()))
                .orElseThrow(() -> ApiException.notFound("Нет в архиве."));
        return forPlayer(a, true);
    }

    private static PlayerArticle forPlayer(WorldArticle a, boolean withBody) {
        String body = withBody && a.getStatus() == Status.OPEN ? a.getBody() : null;
        return new PlayerArticle(a.getSlug(), a.getCategory().name(), a.getTitle(), a.getTeaser(), body,
                a.getStatus().name(), a.getStatus() == Status.OPEN ? a.getRevealedAt() : null);
    }

    // ── GM ──

    @Transactional(readOnly = true)
    public List<GmArticle> all() {
        return repository.findAllByOrderByTitleAsc().stream().map(WorldService::forGm).toList();
    }

    @Transactional(readOnly = true)
    public GmArticle one(Long id) {
        return forGm(find(id));
    }

    @Transactional
    public GmArticle create(ArticleInput in, User gm) {
        WorldArticle a = new WorldArticle();
        apply(a, in, gm);
        WorldArticle saved = repository.save(a);
        logStatus(gm, saved, null);
        return forGm(saved);
    }

    @Transactional
    public GmArticle update(Long id, ArticleInput in, User gm) {
        WorldArticle a = find(id);
        Status before = a.getStatus();
        apply(a, in, gm);
        WorldArticle saved = repository.save(a);
        logStatus(gm, saved, before);
        return forGm(saved);
    }

    @Transactional
    public GmArticle setStatus(Long id, String status, User gm) {
        WorldArticle a = find(id);
        Status before = a.getStatus();
        changeStatus(a, status(status));
        a.setUpdatedBy(gm != null ? gm.getUsername() : null);
        WorldArticle saved = repository.save(a);
        logStatus(gm, saved, before);
        return forGm(saved);
    }

    private static final java.util.Map<Status, String> STATUS_RU =
            java.util.Map.of(Status.HIDDEN, "скрыто", Status.REDACTED, "засекречено", Status.OPEN, "открыто");

    private void logStatus(User gm, WorldArticle a, Status before) {
        if (a.getStatus() == before) return;
        gmLog.record(gm, "ARTICLE_STATUS", "ARTICLE", a.getId(), a.getTitle(),
                (before == null ? "Новая статья: " : "Статус: " + STATUS_RU.get(before) + " → ") + STATUS_RU.get(a.getStatus()));
    }

    @Transactional
    public void delete(Long id) {
        repository.delete(find(id));
    }

    private WorldArticle find(Long id) {
        return repository.findById(id).orElseThrow(() -> ApiException.notFound("Статья не найдена."));
    }

    private void apply(WorldArticle a, ArticleInput in, User gm) {
        String slug = blank(in.slug());
        if (slug == null) throw ApiException.badRequest("Укажите адрес статьи.");
        slug = slug.toLowerCase(Locale.ROOT);
        if (slug.length() > 80 || !SLUG.matcher(slug).matches()) {
            throw ApiException.badRequest("Адрес — латиница, цифры и дефисы, например demon-continent.");
        }
        String taken = slug;
        if (repository.findBySlug(slug).filter(x -> !x.getId().equals(a.getId())).isPresent()) {
            throw ApiException.conflict("Статья с адресом «" + taken + "» уже есть.");
        }
        String title = blank(in.title());
        if (title == null) throw ApiException.badRequest("Укажите заголовок.");
        a.setSlug(slug);
        a.setTitle(title);
        a.setCategory(category(in.category()));
        a.setTeaser(blank(in.teaser()));
        a.setBody(blank(in.body()));
        a.setGmNotes(blank(in.gmNotes()));
        changeStatus(a, in.status() == null ? (a.getStatus() != null ? a.getStatus() : Status.HIDDEN) : status(in.status()));
        a.setUpdatedBy(gm != null ? gm.getUsername() : null);
    }

    /** Becoming OPEN stamps revealedAt; the date stays if it closes again. */
    private static void changeStatus(WorldArticle a, Status next) {
        if (next == Status.OPEN && (a.getStatus() != Status.OPEN || a.getRevealedAt() == null)) {
            a.setRevealedAt(LocalDateTime.now());
        }
        a.setStatus(next);
    }

    private static GmArticle forGm(WorldArticle a) {
        return new GmArticle(a.getId(), a.getSlug(), a.getCategory().name(), a.getTitle(), a.getTeaser(), a.getBody(),
                a.getStatus().name(), a.getGmNotes(), a.getRevealedAt(), a.getUpdatedAt(), a.getUpdatedBy());
    }

    private static Status status(String raw) {
        try {
            return Status.valueOf(raw == null ? "" : raw.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Статус — скрыто, засекречено или открыто.");
        }
    }

    private static WorldArticle.Category category(String raw) {
        if (raw == null || raw.isBlank()) return WorldArticle.Category.OTHER;
        try {
            return WorldArticle.Category.valueOf(raw.strip().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw ApiException.badRequest("Неизвестная категория: " + raw + ".");
        }
    }

    private static String blank(String s) {
        return s == null || s.isBlank() ? null : s.strip();
    }

    // ── Seed ──

    /** The starting articles, once, while the table is empty. */
    @Transactional
    public int seedIfEmpty() {
        if (repository.count() > 0) return 0;
        try (InputStream in = new ClassPathResource(SEED).getInputStream()) {
            JsonNode root = objectMapper.readTree(in);
            int n = 0;
            for (JsonNode node : root.path("articles")) {
                WorldArticle a = new WorldArticle();
                apply(a, new ArticleInput(node.path("slug").asText(null), node.path("category").asText(null),
                        node.path("title").asText(null), node.path("teaser").asText(null), node.path("body").asText(null),
                        node.path("status").asText("HIDDEN"), null), null);
                a.setUpdatedBy("сид");
                repository.save(a);
                n++;
            }
            log.info("World: seeded {} articles", n);
            return n;
        } catch (ApiException e) {
            throw e;
        } catch (Exception e) {
            log.warn("World: no seed ({})", e.getMessage());
            return 0;
        }
    }
}
