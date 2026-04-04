package ru.fun.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.fun.authservice.entity.SubscriptionWebhookEvent;

import java.util.Optional;
import java.util.UUID;

public interface SubscriptionWebhookEventRepository extends JpaRepository<SubscriptionWebhookEvent, UUID> {
    Optional<SubscriptionWebhookEvent> findByDeliveryKey(String deliveryKey);
}
