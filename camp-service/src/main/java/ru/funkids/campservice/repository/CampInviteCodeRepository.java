package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.campservice.entity.CampInviteCode;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CampInviteCodeRepository extends JpaRepository<CampInviteCode, UUID> {

    Optional<CampInviteCode> findByCodeAndActiveTrue(String code);

    /** Все активные коды лагеря (для управления в UI) */
    List<CampInviteCode> findByCampIdAndActiveTrue(UUID campId);

    /** Активные коды конкретной смены */
    List<CampInviteCode> findByCampIdAndSessionIdAndActiveTrue(UUID campId, UUID sessionId);
}