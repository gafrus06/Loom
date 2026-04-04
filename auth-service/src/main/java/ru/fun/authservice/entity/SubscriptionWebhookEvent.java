package ru.fun.authservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "subscription_webhook_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubscriptionWebhookEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "delivery_key", nullable = false, unique = true, length = 64)
    private String deliveryKey;

    @Column(name = "payment_id", length = 100)
    private String paymentId;

    @Column(name = "event_type", length = 100)
    private String eventType;

    @Column(name = "raw_body", nullable = false, columnDefinition = "TEXT")
    private String rawBody;

    @Column(nullable = false)
    @Builder.Default
    private boolean processed = false;

    @Column(name = "received_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant receivedAt = Instant.now();
}
