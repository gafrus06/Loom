package ru.fun.userservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.fun.userservice.repository.ProcessedAuthEventRepository;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class ProcessedAuthEventCleanupService {

    private final ProcessedAuthEventRepository repository;

    @Value("${user-service.inbox.retention-days:30}")
    private long retentionDays;

    @Scheduled(fixedDelayString = "${user-service.inbox.cleanup.fixed-delay-ms:3600000}")
    @Transactional
    public void cleanup() {
        repository.deleteAll(repository.findByProcessedAtBefore(Instant.now().minusSeconds(retentionDays * 86_400)));
    }
}
