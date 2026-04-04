package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.campservice.entity.DetachmentJournal;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DetachmentJournalRepository extends JpaRepository<DetachmentJournal, UUID> {

    Optional<DetachmentJournal> findByDetachmentIdAndJournalDate(UUID detachmentId, LocalDate journalDate);

    List<DetachmentJournal> findByDetachmentIdOrderByJournalDateDesc(UUID detachmentId);
}
