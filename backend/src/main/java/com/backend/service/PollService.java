package com.backend.service;

import com.backend.entity.Poll;
import com.backend.entity.PollOption;
import com.backend.entity.PollVote;
import com.backend.repository.PollRepository;
import com.backend.repository.PollVoteRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class PollService {

    private final PollRepository pollRepository;
    private final PollVoteRepository pollVoteRepository;

    public List<Poll> listPolls() {
        return pollRepository.findAllNewestFirst();
    }

    public Poll createPoll(String question, String authorName, List<String> optionLabels) {
        Poll poll = Poll.builder().question(question).authorName(authorName).build();
        List<PollOption> options = new ArrayList<>();
        int order = 0;
        for (String label : optionLabels) {
            options.add(PollOption.builder().poll(poll).label(label).displayOrder(order++).build());
        }
        poll.setOptions(options);
        return pollRepository.save(poll);
    }

    public Poll setClosed(Long pollId, boolean closed) {
        Poll poll = pollRepository.findById(pollId)
                .orElseThrow(() -> new RuntimeException("Poll not found"));
        poll.setClosed(closed);
        return pollRepository.save(poll);
    }

    public void deletePoll(Long pollId) {
        pollRepository.deleteById(pollId);
    }

    /**
     * Casts (or moves) a user's vote. One vote per user per poll - voting
     * again just moves it to the newly picked option.
     */
    @Transactional
    public Poll vote(Long pollId, Long optionId, Long userId) {
        Poll poll = pollRepository.findById(pollId)
                .orElseThrow(() -> new RuntimeException("Poll not found"));
        if (poll.isClosed()) {
            throw new RuntimeException("This poll is closed");
        }
        PollOption target = poll.getOptions().stream()
                .filter(o -> o.getId().equals(optionId))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Option not found"));

        Optional<PollVote> existing = pollVoteRepository.findByPollIdAndUserId(pollId, userId);
        if (existing.isPresent()) {
            PollVote vote = existing.get();
            if (vote.getOptionId().equals(optionId)) {
                return poll;
            }
            poll.getOptions().stream()
                    .filter(o -> o.getId().equals(vote.getOptionId()))
                    .findFirst()
                    .ifPresent(o -> o.setVotes(Math.max(0, o.getVotes() - 1)));
            vote.setOptionId(optionId);
            pollVoteRepository.save(vote);
        } else {
            pollVoteRepository.save(PollVote.builder().pollId(pollId).userId(userId).optionId(optionId).build());
        }

        target.setVotes(target.getVotes() + 1);
        return pollRepository.save(poll);
    }
}
