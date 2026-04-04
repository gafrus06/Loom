package ru.fun.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.fun.authservice.entity.SubscriptionPayment;
import ru.fun.authservice.entity.User;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

public interface SubscriptionPaymentRepository extends JpaRepository<SubscriptionPayment, UUID> {
    Optional<SubscriptionPayment> findByPaymentId(String paymentId);
    Optional<SubscriptionPayment> findByRequestKey(String requestKey);
    Optional<SubscriptionPayment> findTopByUserAndPaymentTypeAndStatusOrderByCreatedAtDesc(User user, String paymentType, String status);
    long countByUserAndStatusAndCreatedAtAfter(User user, String status, Instant after);
}
