package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.campservice.entity.CampSettings;

import java.util.Optional;
import java.util.UUID;

public interface CampSettingsRepository extends JpaRepository<CampSettings, UUID> {
    Optional<CampSettings> findByCampId(UUID campId);
}
