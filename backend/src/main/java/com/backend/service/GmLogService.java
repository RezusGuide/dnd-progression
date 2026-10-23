package com.backend.service;

import com.backend.entity.Character;
import com.backend.entity.GmActionLog;
import com.backend.entity.User;
import com.backend.repository.GmActionLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * «Журнал»: one line per GM action. The actor comes from the request's
 * security context, so callers only say what happened and to whom.
 */
@Service
@RequiredArgsConstructor
public class GmLogService {

    public static final int SUMMARY_LENGTH = 500;
    public static final int MAX_PAGE_SIZE = 100;

    private final GmActionLogRepository repository;

    public void record(String action, String targetType, Long targetId, String targetName, String summary) {
        record(null, action, targetType, targetId, targetName, summary);
    }

    /** actor: who acted, when the caller knows; otherwise the signed-in user. */
    public void record(User actor, String action, String targetType, Long targetId, String targetName, String summary) {
        String text = summary == null ? null : summary.strip();
        if (text != null && text.length() > SUMMARY_LENGTH) text = text.substring(0, SUMMARY_LENGTH - 1) + "…";
        repository.save(GmActionLog.builder()
                .actor(actor != null ? actor.getUsername() : currentUsername())
                .action(action)
                .targetType(targetType).targetId(targetId).targetName(targetName)
                .summary(text)
                .build());
    }

    public void character(String action, Character c, String summary) {
        character(null, action, c, summary);
    }

    public void character(User actor, String action, Character c, String summary) {
        record(actor, action, "CHARACTER", c.getId(), c.getName(), summary);
    }

    @Transactional(readOnly = true)
    public Page<GmActionLog> page(String action, int page, int size) {
        PageRequest request = PageRequest.of(Math.max(0, page), Math.min(Math.max(1, size), MAX_PAGE_SIZE));
        return action == null || action.isBlank()
                ? repository.findAllByOrderByAtDescIdDesc(request)
                : repository.findByActionOrderByAtDescIdDesc(action, request);
    }

    private static String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getPrincipal() instanceof User u ? u.getUsername() : null;
    }
}
