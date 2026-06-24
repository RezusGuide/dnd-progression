package com.backend.service;

import com.backend.dto.CharacterRequest;
import com.backend.entity.Character;
import com.backend.entity.User;
import com.backend.repository.CharacterRepository;
import com.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CharacterService {

    private final CharacterRepository characterRepository;
    private final UserRepository userRepository;

    public Character createCharacter(CharacterRequest request, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Character character = Character.builder()
                .name(request.getName())
                .characterClass(request.getCharacterClass())
                .race(request.getRace())
                .backstory(request.getBackstory())
                .level(1)
                .user(user)
                .build();

        return characterRepository.save(character);
    }

    public List<Character> getCharacters(Long userId) {
        return characterRepository.findByUserId(userId);
    }

    public Character getCharacter(Long characterId, Long userId) {
        return characterRepository.findByIdAndUserId(characterId, userId)
                .orElseThrow(() -> new RuntimeException("Character not found"));
    }

    public void deleteCharacter(Long characterId, Long userId) {
        Character character = characterRepository.findByIdAndUserId(characterId, userId)
                .orElseThrow(() -> new RuntimeException("Character not found"));
        characterRepository.delete(character);
    }
}