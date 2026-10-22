package com.backend.service;

import com.backend.calendar.AvailabilityCalculator;
import com.backend.dto.CalendarDtos.ExceptionDto;
import com.backend.dto.CalendarDtos.HeatCellDto;
import com.backend.dto.CalendarDtos.LocalTimeSpan;
import com.backend.dto.CalendarDtos.NewPoll;
import com.backend.dto.CalendarDtos.Person;
import com.backend.dto.CalendarDtos.PollDto;
import com.backend.dto.CalendarDtos.Profile;
import com.backend.dto.CalendarDtos.SessionDto;
import com.backend.dto.CalendarDtos.WindowDto;
import com.backend.entity.Announcement;
import com.backend.entity.AvailabilityException;
import com.backend.entity.AvailabilityProfile;
import com.backend.entity.Campaign;
import com.backend.entity.GameSession;
import com.backend.entity.SessionPoll;
import com.backend.entity.User;
import com.backend.exception.ApiException;
import com.backend.repository.AnnouncementRepository;
import com.backend.repository.AvailabilityExceptionRepository;
import com.backend.repository.AvailabilityProfileRepository;
import com.backend.repository.CampaignRepository;
import com.backend.repository.CharacterRepository;
import com.backend.repository.GameSessionRepository;
import com.backend.repository.SessionPollRepository;
import com.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DateTimeException;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

/**
 * Календарь (docs/zlatopryady/prompts/08-calendar.md): a user's own free
 * time, session polls with windows computed on the fly, scheduling with an
 * announcement, sessions and their .ics. Everything belongs to users, not
 * characters. Other participants only ever see a name and a time zone.
 */
@Service
@RequiredArgsConstructor
public class CalendarService {

    public static final int MAX_RANGE_DAYS = 31;
    public static final int MAX_DURATION = 12 * 60;
    static final DateTimeFormatter ANNOUNCE = DateTimeFormatter.ofPattern("EEEE, d MMMM yyyy, HH:mm", Locale.forLanguageTag("ru"));
    static final DateTimeFormatter ICS = DateTimeFormatter.ofPattern("yyyyMMdd'T'HHmmss'Z'").withZone(ZoneOffset.UTC);

    private final AvailabilityProfileRepository profileRepository;
    private final AvailabilityExceptionRepository exceptionRepository;
    private final SessionPollRepository pollRepository;
    private final GameSessionRepository sessionRepository;
    private final AnnouncementRepository announcementRepository;
    private final CampaignRepository campaignRepository;
    private final CharacterRepository characterRepository;
    private final UserRepository userRepository;

    @Value("${app.site-url:http://localhost:5173}")
    private String siteUrl;

    // ── Helpers ──

    static ZoneId zone(String raw) {
        try {
            return ZoneId.of(raw);
        } catch (DateTimeException | NullPointerException e) {
            throw ApiException.badRequest("Неизвестный часовой пояс.");
        }
    }

    private static LocalTime time(String raw, LocalTime fallback) {
        if (raw == null || raw.isBlank()) return fallback;
        try {
            LocalTime t = LocalTime.parse(raw.strip());
            if (t.getMinute() % 30 != 0 || t.getSecond() != 0) throw ApiException.badRequest("Время — с шагом 30 минут.");
            return t;
        } catch (DateTimeException e) {
            throw ApiException.badRequest("Время в формате ЧЧ:ММ.");
        }
    }

    private static boolean isGm(User user) {
        return AdmissionService.isGm(user);
    }

    private static User require(User user) {
        if (user == null) throw ApiException.forbidden("Сначала войдите.");
        return user;
    }

    // ── My time ──

    @Transactional(readOnly = true)
    public Profile myProfile(User user, String browserZone) {
        require(user);
        return profileRepository.findByUserId(user.getId())
                .map(p -> new Profile(true, p.getTimezone(), p.getSleepStart().toString(), p.getSleepEnd().toString(),
                        p.getWeeklyGrid(), p.getUpdatedAt()))
                .orElse(new Profile(false, browserZone, "00:00", "08:00", "0".repeat(AvailabilityCalculator.GRID_LENGTH), null));
    }

    @Transactional
    public Profile saveProfile(User user, Profile body) {
        require(user);
        zone(body.timezone());
        String grid = body.weeklyGrid();
        if (grid == null || grid.length() != AvailabilityCalculator.GRID_LENGTH || !grid.matches("[01]+")) {
            throw ApiException.badRequest("Сетка — 336 клеток из 0 и 1.");
        }
        AvailabilityProfile p = profileRepository.findByUserId(user.getId())
                .orElseGet(() -> AvailabilityProfile.builder().user(userRepository.getReferenceById(user.getId())).build());
        p.setTimezone(body.timezone());
        p.setSleepStart(time(body.sleepStart(), LocalTime.MIDNIGHT));
        p.setSleepEnd(time(body.sleepEnd(), LocalTime.of(8, 0)));
        p.setWeeklyGrid(grid);
        profileRepository.save(p);
        return myProfile(user, body.timezone());
    }

    @Transactional(readOnly = true)
    public List<ExceptionDto> myExceptions(User user) {
        require(user);
        return exceptionRepository.findByUserIdOrderByDateAsc(user.getId()).stream().map(CalendarService::toDto).toList();
    }

    @Transactional
    public ExceptionDto saveException(User user, Long id, ExceptionDto body) {
        require(user);
        if (body.date() == null) throw ApiException.badRequest("Укажите дату.");
        AvailabilityException.Kind kind;
        try {
            kind = AvailabilityException.Kind.valueOf(body.kind());
        } catch (IllegalArgumentException | NullPointerException e) {
            throw ApiException.badRequest("Исключение — «занят» или «свободен».");
        }
        Integer start = body.startMinute();
        Integer end = body.endMinute();
        if ((start == null) != (end == null)) throw ApiException.badRequest("Укажите и начало, и конец.");
        if (start != null && (start < 0 || end > 24 * 60 || start >= end || start % 30 != 0 || end % 30 != 0)) {
            throw ApiException.badRequest("Время — с шагом 30 минут, начало раньше конца.");
        }
        AvailabilityException e = id == null ? AvailabilityException.builder().user(userRepository.getReferenceById(user.getId())).build()
                : exceptionRepository.findById(id).filter(x -> x.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> ApiException.notFound("Исключение не найдено."));
        e.setDate(body.date());
        e.setKind(kind);
        e.setStartMinute(start);
        e.setEndMinute(end);
        return toDto(exceptionRepository.save(e));
    }

    @Transactional
    public void deleteException(User user, Long id) {
        require(user);
        exceptionRepository.delete(exceptionRepository.findById(id).filter(x -> x.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> ApiException.notFound("Исключение не найдено.")));
    }

    private static ExceptionDto toDto(AvailabilityException e) {
        return new ExceptionDto(e.getId(), e.getDate(), e.getKind().name(), e.getStartMinute(), e.getEndMinute());
    }

    // ── Polls ──

    private boolean canSee(SessionPoll poll, User user) {
        return isGm(user) || poll.getParticipants().stream().anyMatch(u -> u.getId().equals(user.getId()));
    }

    @Transactional(readOnly = true)
    public List<PollDto> polls(User user) {
        require(user);
        List<SessionPoll> rows = isGm(user) ? pollRepository.findAllByOrderByCreatedAtDesc()
                : pollRepository.findByParticipantsIdOrderByCreatedAtDesc(user.getId());
        return rows.stream().map(p -> toDto(p, false)).toList();
    }

    @Transactional(readOnly = true)
    public PollDto poll(Long id, User user) {
        require(user);
        SessionPoll p = pollRepository.findById(id).orElseThrow(() -> ApiException.notFound("Подбор не найден."));
        if (!canSee(p, user)) throw ApiException.forbidden("Вы не участвуете в этом подборе.");
        return toDto(p, true);
    }

    @Transactional
    public PollDto create(NewPoll body, User gm) {
        require(gm);
        if (!isGm(gm)) throw ApiException.forbidden("Подбор создаёт ГМ.");
        String title = body.title() == null ? "" : body.title().strip();
        if (title.isEmpty()) throw ApiException.badRequest("Укажите название.");
        if (body.dateFrom() == null || body.dateTo() == null || body.dateTo().isBefore(body.dateFrom())) {
            throw ApiException.badRequest("Даты: начало не позже конца.");
        }
        if (ChronoUnit.DAYS.between(body.dateFrom(), body.dateTo()) >= MAX_RANGE_DAYS) {
            throw ApiException.badRequest("Подбор — не дольше " + MAX_RANGE_DAYS + " дней.");
        }
        int duration = body.durationMinutes() == null ? 180 : body.durationMinutes();
        if (duration < 30 || duration > MAX_DURATION || duration % 30 != 0) {
            throw ApiException.badRequest("Длительность — от 30 минут до 12 часов, шагом 30 минут.");
        }
        zone(body.gmTimezone());

        Set<User> participants = new LinkedHashSet<>();
        Campaign campaign = null;
        if (body.campaignId() != null) {
            campaign = campaignRepository.findById(body.campaignId()).orElseThrow(() -> ApiException.notFound("Кампания не найдена."));
        }
        for (Long id : body.participantIds() == null ? List.<Long>of() : body.participantIds()) {
            participants.add(userRepository.findById(id).orElseThrow(() -> ApiException.notFound("Пропуск " + id + " не найден.")));
        }
        if (participants.isEmpty()) throw ApiException.badRequest("Выберите участников.");
        int min = body.minParticipants() == null || body.minParticipants() <= 0 ? participants.size() : body.minParticipants();
        if (min > participants.size()) throw ApiException.badRequest("Минимум участников больше, чем участников.");

        SessionPoll p = pollRepository.save(SessionPoll.builder()
                .title(title).campaign(campaign).participants(participants)
                .dateFrom(body.dateFrom()).dateTo(body.dateTo()).gmTimezone(body.gmTimezone())
                .durationMinutes(duration).minParticipants(min)
                .createdBy(gm.getUsername())
                .build());
        return toDto(p, false);
    }

    @Transactional
    public SessionDto schedule(Long id, Instant startUtc, User gm) {
        require(gm);
        if (!isGm(gm)) throw ApiException.forbidden("Сессию назначает ГМ.");
        SessionPoll p = pollRepository.findById(id).orElseThrow(() -> ApiException.notFound("Подбор не найден."));
        if (p.getStatus() != SessionPoll.Status.OPEN) throw ApiException.conflict("Подбор уже закрыт.");
        if (startUtc == null) throw ApiException.badRequest("Укажите время начала.");

        GameSession s = sessionRepository.save(GameSession.builder()
                .poll(p).title(p.getTitle()).startUtc(startUtc).durationMinutes(p.getDurationMinutes())
                .campaign(p.getCampaign()).createdBy(gm.getUsername())
                .build());
        p.setStatus(SessionPoll.Status.SCHEDULED);
        pollRepository.save(p);

        ZonedDateTime local = startUtc.atZone(zone(p.getGmTimezone()));
        announcementRepository.save(Announcement.builder()
                .title("Сессия назначена: " + p.getTitle())
                .body("Начало: " + local.format(ANNOUNCE) + " (" + p.getGmTimezone() + "), длительность "
                        + formatDuration(p.getDurationMinutes()) + ".\nВ Приёмной время показано по вашему поясу.")
                .author(userRepository.getReferenceById(gm.getId()))
                .authorName(gm.getUsername())
                .build());
        return toDto(s);
    }

    @Transactional
    public PollDto cancel(Long id, User gm) {
        require(gm);
        if (!isGm(gm)) throw ApiException.forbidden("Подбор отменяет ГМ.");
        SessionPoll p = pollRepository.findById(id).orElseThrow(() -> ApiException.notFound("Подбор не найден."));
        if (p.getStatus() != SessionPoll.Status.OPEN) throw ApiException.conflict("Подбор уже закрыт.");
        p.setStatus(SessionPoll.Status.CANCELLED);
        return toDto(pollRepository.save(p), false);
    }

    static String formatDuration(int minutes) {
        int h = minutes / 60;
        int m = minutes % 60;
        return (h > 0 ? h + " ч" : "") + (h > 0 && m > 0 ? " " : "") + (m > 0 ? m + " мин" : "");
    }

    private PollDto toDto(SessionPoll p, boolean withWindows) {
        List<User> users = new ArrayList<>(p.getParticipants());
        users.sort(Comparator.comparing(User::getUsername));
        List<Long> ids = users.stream().map(User::getId).toList();
        Map<Long, AvailabilityProfile> profiles = new LinkedHashMap<>();
        profileRepository.findByUserIdIn(ids).forEach(pr -> profiles.put(pr.getUser().getId(), pr));

        List<Person> people = users.stream()
                .map(u -> new Person(u.getId(), u.getUsername(),
                        profiles.containsKey(u.getId()) ? profiles.get(u.getId()).getTimezone() : null,
                        profiles.containsKey(u.getId())))
                .toList();

        List<WindowDto> windows = null;
        List<HeatCellDto> heat = null;
        List<Long> without = null;
        if (withWindows) {
            Map<Long, List<AvailabilityCalculator.Exception>> exceptions = new LinkedHashMap<>();
            for (AvailabilityException e : exceptionRepository.findByUserIdIn(ids)) {
                exceptions.computeIfAbsent(e.getUser().getId(), k -> new ArrayList<>())
                        .add(new AvailabilityCalculator.Exception(e.getDate(),
                                AvailabilityCalculator.Kind.valueOf(e.getKind().name()), e.getStartMinute(), e.getEndMinute()));
            }
            ZoneId gmZone = zone(p.getGmTimezone());
            List<AvailabilityCalculator.Participant> participants = new ArrayList<>();
            for (User u : users) {
                AvailabilityProfile pr = profiles.get(u.getId());
                participants.add(pr == null
                        ? new AvailabilityCalculator.Participant(String.valueOf(u.getId()), u.getUsername(), gmZone, null, null, null, List.of())
                        : new AvailabilityCalculator.Participant(String.valueOf(u.getId()), u.getUsername(), zone(pr.getTimezone()),
                        pr.getSleepStart(), pr.getSleepEnd(), pr.getWeeklyGrid(), exceptions.getOrDefault(u.getId(), List.of())));
            }
            AvailabilityCalculator.Result r = AvailabilityCalculator.calculate(
                    new AvailabilityCalculator.Poll(p.getDateFrom(), p.getDateTo(), gmZone, p.getDurationMinutes(), p.getMinParticipants()),
                    participants);
            windows = r.windows().stream().map(w -> new WindowDto(w.start(), w.end(), w.score(),
                    w.available().stream().map(Long::valueOf).toList(),
                    w.unavailable().stream().map(Long::valueOf).toList(),
                    w.local().stream().map(l -> new LocalTimeSpan(Long.valueOf(l.participantId()), l.name(),
                            profiles.containsKey(Long.valueOf(l.participantId())) ? l.zone().getId() : null,
                            l.start(), l.end(), l.inconvenient())).toList())).toList();
            heat = r.heatMap().stream().map(c -> new HeatCellDto(c.start(), c.free().stream().map(Long::valueOf).toList())).toList();
            without = r.withoutProfile().stream().map(Long::valueOf).toList();
        }
        Long sessionId = sessionRepository.findAll().stream()
                .filter(s -> s.getPoll() != null && s.getPoll().getId().equals(p.getId()))
                .map(GameSession::getId).findFirst().orElse(null);
        return new PollDto(p.getId(), p.getTitle(),
                p.getCampaign() != null ? p.getCampaign().getId() : null,
                p.getCampaign() != null ? p.getCampaign().getName() : null,
                p.getDateFrom(), p.getDateTo(), p.getGmTimezone(), p.getDurationMinutes(), p.getMinParticipants(),
                p.getStatus().name(), p.getCreatedBy(), p.getCreatedAt(), people, sessionId, windows, heat, without);
    }

    // ── Sessions ──

    private boolean canSee(GameSession s, User user) {
        if (isGm(user)) return true;
        if (s.getPoll() != null && s.getPoll().getParticipants().stream().anyMatch(u -> u.getId().equals(user.getId()))) return true;
        return s.getCampaign() != null && characterRepository.findByCampaignId(s.getCampaign().getId()).stream()
                .anyMatch(c -> c.getUser() != null && c.getUser().getId().equals(user.getId()));
    }

    @Transactional(readOnly = true)
    public List<SessionDto> sessions(User user, boolean upcoming) {
        require(user);
        Instant now = Instant.now();
        return sessionRepository.findAllByOrderByStartUtcAsc().stream()
                .filter(s -> canSee(s, user))
                .filter(s -> !upcoming || s.getStartUtc().plus(Duration.ofMinutes(s.getDurationMinutes())).isAfter(now))
                .map(CalendarService::toDto).toList();
    }

    private static SessionDto toDto(GameSession s) {
        return new SessionDto(s.getId(), s.getTitle(), s.getStartUtc(), s.getDurationMinutes(),
                s.getPoll() != null ? s.getPoll().getId() : null,
                s.getCampaign() != null ? s.getCampaign().getId() : null,
                s.getCampaign() != null ? s.getCampaign().getName() : null,
                s.getNote(), s.getCreatedBy());
    }

    /** The session as an iCalendar file (RFC 5545), times in UTC. */
    @Transactional(readOnly = true)
    public String ics(Long id, User user) {
        require(user);
        GameSession s = sessionRepository.findById(id).orElseThrow(() -> ApiException.notFound("Сессия не найдена."));
        if (!canSee(s, user)) throw ApiException.forbidden("Эта сессия вам не назначена.");
        String site = siteUrl.endsWith("/") ? siteUrl.substring(0, siteUrl.length() - 1) : siteUrl;
        String description = (s.getNote() != null && !s.getNote().isBlank() ? s.getNote().strip() + "\n" : "")
                + "Санни инкорпорейтед: " + site + "/calendar";
        List<String> lines = List.of(
                "BEGIN:VCALENDAR",
                "VERSION:2.0",
                "PRODID:-//Sunny Inc//Zlatopryady//RU",
                "CALSCALE:GREGORIAN",
                "METHOD:PUBLISH",
                "BEGIN:VEVENT",
                "UID:session-" + s.getId() + "@sunny-inc",
                "DTSTAMP:" + ICS.format(Instant.now()),
                "DTSTART:" + ICS.format(s.getStartUtc()),
                "DTEND:" + ICS.format(s.getStartUtc().plus(Duration.ofMinutes(s.getDurationMinutes()))),
                "SUMMARY:" + escape(s.getTitle()),
                "DESCRIPTION:" + escape(description),
                "URL:" + site + "/calendar",
                "END:VEVENT",
                "END:VCALENDAR");
        StringBuilder out = new StringBuilder();
        for (String line : lines) out.append(fold(line)).append("\r\n");
        return out.toString();
    }

    static String escape(String text) {
        return text.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\r\n", "\\n").replace("\n", "\\n");
    }

    /** Lines longer than 75 octets continue on the next line after a space (RFC 5545, 3.1). */
    static String fold(String line) {
        byte[] bytes = line.getBytes(java.nio.charset.StandardCharsets.UTF_8);
        if (bytes.length <= 75) return line;
        StringBuilder out = new StringBuilder();
        int octets = 0;
        int limit = 75;
        for (int i = 0; i < line.length(); ) {
            int cp = line.codePointAt(i);
            String ch = new String(Character.toChars(cp));
            int size = ch.getBytes(java.nio.charset.StandardCharsets.UTF_8).length;
            if (octets + size > limit) {
                out.append("\r\n ");
                octets = 1;
                limit = 75;
            }
            out.append(ch);
            octets += size;
            i += Character.charCount(cp);
        }
        return out.toString();
    }
}
