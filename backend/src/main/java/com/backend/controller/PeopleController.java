package com.backend.controller;

import com.backend.entity.Connection;
import com.backend.entity.Person;
import com.backend.repository.ConnectionRepository;
import com.backend.repository.PersonRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// The whole /api/people/** path is locked to the owner in SecurityConfig
// (hasAuthority SECTION_ALL, no public GET) - Useful Functions is never
// visible to anyone but you, logged in or not.
@RestController
@RequestMapping("/api/people")
@RequiredArgsConstructor
public class PeopleController {

    private final PersonRepository personRepository;
    private final ConnectionRepository connectionRepository;

    @GetMapping
    public ResponseEntity<List<Person>> listPeople() {
        return ResponseEntity.ok(personRepository.findAllOrdered());
    }

    @PostMapping
    public ResponseEntity<Person> createPerson(@RequestBody Person person) {
        person.setId(null);
        return ResponseEntity.status(201).body(personRepository.save(person));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Person> updatePerson(@PathVariable Long id, @RequestBody Person person) {
        person.setId(id);
        return ResponseEntity.ok(personRepository.save(person));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePerson(@PathVariable Long id) {
        // Clean up any edges touching this node so the graph never carries
        // a dangling connection.
        connectionRepository.findByPersonAIdOrPersonBId(id, id).forEach(connectionRepository::delete);
        personRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/connections")
    public ResponseEntity<List<Connection>> listConnections() {
        return ResponseEntity.ok(connectionRepository.findAll());
    }

    @PostMapping("/connections")
    public ResponseEntity<Connection> createConnection(@RequestBody Connection connection) {
        connection.setId(null);
        return ResponseEntity.status(201).body(connectionRepository.save(connection));
    }

    @DeleteMapping("/connections/{id}")
    public ResponseEntity<Void> deleteConnection(@PathVariable Long id) {
        connectionRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
