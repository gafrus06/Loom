package ru.fun.authservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "admin_subscriptions")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class AdminSubscription {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    /** Когда истекает подписка */
    @Column(nullable = false)
    private Instant expiresAt;

    /** false = уже отработала, роль снята */
    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    /** YooKassa payment id — для идемпотентности webhook */
    @Column(unique = true)
    private String paymentId;
}