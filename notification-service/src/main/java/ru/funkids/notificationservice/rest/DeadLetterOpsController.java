package ru.funkids.notificationservice.rest;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ru.funkids.notificationservice.entity.DeadLetterEvent;
import ru.funkids.notificationservice.service.DeadLetterOperationsService;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/internal/ops/dead-letters")
@RequiredArgsConstructor
public class DeadLetterOpsController {

    private final DeadLetterOperationsService service;

    @GetMapping
    public List<DeadLetterEvent> list() {
        return service.list("notification-service");
    }

    @PostMapping("/{id}/replay")
    public ResponseEntity<Void> replay(@PathVariable UUID id) {
        service.replay(id);
        return ResponseEntity.accepted().build();
    }
}
