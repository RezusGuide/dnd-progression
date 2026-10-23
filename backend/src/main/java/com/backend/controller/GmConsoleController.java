package com.backend.controller;

import com.backend.dto.GmDtos.InspirationGrant;
import com.backend.dto.GmDtos.Note;
import com.backend.dto.GmDtos.StaffRow;
import com.backend.dto.GmDtos.Summary;
import com.backend.dto.GmDtos.XpGrant;
import com.backend.entity.GmActionLog;
import com.backend.service.GmConsoleService;
import com.backend.service.GmLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** Пульт ГМ: summary, staff and group actions, the GM's note, the log. */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class GmConsoleController {

    private final GmConsoleService console;
    private final GmLogService gmLog;

    @GetMapping("/summary")
    public ResponseEntity<Summary> summary() {
        return ResponseEntity.ok(console.summary());
    }

    @GetMapping("/staff")
    public ResponseEntity<List<StaffRow>> staff() {
        return ResponseEntity.ok(console.staff());
    }

    // Body: {"characterIds": [1, 2], "amount": 300, "comment": "..."}.
    @PostMapping("/staff/xp")
    public ResponseEntity<List<StaffRow>> xp(@RequestBody XpGrant body) {
        return ResponseEntity.ok(console.grantXp(body.characterIds(), body.amount(), body.comment()));
    }

    // Body: {"characterIds": [1, 2], "value": true}.
    @PostMapping("/staff/inspiration")
    public ResponseEntity<List<StaffRow>> inspiration(@RequestBody InspirationGrant body) {
        return ResponseEntity.ok(console.setInspiration(body.characterIds(), body.value()));
    }

    @GetMapping("/gm-note")
    public ResponseEntity<Note> note() {
        return ResponseEntity.ok(console.note());
    }

    // Body: {"body": "Markdown"}.
    @PutMapping("/gm-note")
    public ResponseEntity<Note> saveNote(@RequestBody Map<String, String> body) {
        return ResponseEntity.ok(console.saveNote(body.get("body")));
    }

    @GetMapping("/log")
    public ResponseEntity<Map<String, Object>> log(@RequestParam(required = false) String action,
                                                   @RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "30") int size) {
        Page<GmActionLog> p = gmLog.page(action, page, size);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("items", p.getContent());
        out.put("page", p.getNumber());
        out.put("pages", p.getTotalPages());
        out.put("total", p.getTotalElements());
        return ResponseEntity.ok(out);
    }
}
