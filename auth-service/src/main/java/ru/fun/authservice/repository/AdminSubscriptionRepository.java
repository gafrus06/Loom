package ru.fun.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import ru.fun.authservice.entity.AdminSubscription;
import ru.fun.authservice.entity.User;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AdminSubscriptionRepository extends JpaRepository<AdminSubscription, UUID> {

    Optional<AdminSubscription> findByUser(User user);

    Optional<AdminSubscription> findByPaymentId(String paymentId);

    /** Все активные подписки у которых срок истёк — для шедулера */
    @Query("SELECT s FROM AdminSubscription s WHERE s.active = true AND s.expiresAt < :now")
    List<AdminSubscription> findExpired(Instant now);
}