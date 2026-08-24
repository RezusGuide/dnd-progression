package com.backend.controller;

import com.backend.entity.Poll;
import com.backend.entity.User;
import com.backend.service.PollService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

// GET is public (SecurityConfig permits it). Every other method just needs
// to be logged in - any account can start a poll about the server's future
// or vote in one, same as D&D and Minecraft CRUD.
@RestController
@RequestMapping("/api/polls")
@RequiredArgsConstructor
public class PollController {

    private final PollService pollService;

    @GetMapping
    public ResponseEntity<List<Poll>> list() {
        return ResponseEntity.ok(pollService.listPolls());
    }

    @SuppressWarnings("unchecked")
    @PostMapping
    public ResponseEntity<Poll> create(@RequestBody Map<String, Object> body, @AuthenticationPrincipal User user) {
        String question = (String) body.get("question");
        List<String> options = (List<String>) body.getOrDefault("options", List.of());
        Poll poll = pollService.createPoll(question, user.getUsername(), options);
        return ResponseEntity.status(201).body(poll);
    }

    @PostMapping("/{id}/vote")
    public ResponseEntity<Poll> vote(@PathVariable Long id, @RequestBody Map<String, Long> body,
                                      @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(pollService.vote(id, body.get("optionId"), user.getId()));
    }

    @PutMapping("/{id}/close")
    public ResponseEntity<Poll> close(@PathVariable Long id) {
        return ResponseEntity.ok(pollService.setClosed(id, true));
    }

    @PutMapping("/{id}/reopen")
    public ResponseEntity<Poll> reopen(@PathVariable Long id) {
        return ResponseEntity.ok(pollService.setClosed(id, false));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        pollService.deletePoll(id);
        return ResponseEntity.noContent().build();
    }
}
