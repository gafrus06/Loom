package ru.funkids.notificationservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ru.funkids.notificationservice.repository.ProcessedInboundEventRepository;

import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class ProcessedInboundEventCleanupService {

    private final ProcessedInboundEventRepository repository;

    @Value("${app.processed-event.retention-days:14}")
    private long retentionDays;

    @Scheduled(fixedDelayString = "${app.processed-event.cleanup.fixed-delay-ms:3600000}")
    @Transactional
    public void cleanupOldRecords() {
        repository.deleteAll(repository.findByProcessedAtBefore(OffsetDateTime.now().minusDays(retentionDays)));
    }
}
