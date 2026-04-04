package ru.fun.userservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/**
 * Профиль вожатого.
 *
 * Создаётся автоматически при получении события user.role.changed
 * с action=ASSIGNED и role=ROLE_COUNSELOR.
 *
 * Удаляется при action=REMOVED и role=ROLE_COUNSELOR.
 *
 * Поля по плану (раздел 6.4):
 *   - образование (educationDocumentIds, specialization)
 *   - опыт (experienceYears, bio)
 *   - рейтинг (rating — выставляется администратором)
 *   - countOfCompletedShifts — увеличивается автоматически после окончания смены
 */
@Entity
@Table(name = "counselors")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString(exclude = "userProfile")
public class CounselorProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserProfile userProfile;

    // ── Профессиональные данные ───────────────────────────────────────────────

    @Column(length = 200)
    private String specialization;

    private Long experienceYears;

    @Column(length = 2000)
    private String bio;

    // UUID файлов документов об образовании (через запятую)
    @Column(length = 2000)
    private String educationDocumentIds;

    @Column(length = 100)
    private String telegram;

    @Column(length = 255)
    private String shiftPreference;

    // ── Статистика ────────────────────────────────────────────────────────────

    /**
     * Количество завершённых смен.
     * Увеличивается автоматически через Kafka-событие после окончания смены
     * (camp-service публикует shift.completed → user-service слушает).
     */
    @Builder.Default
    @Column(nullable = false)
    private Integer countOfCompletedShifts = 0;

    /**
     * Средний рейтинг от администраторов (1.0 — 5.0).
     * Обновляется при получении события counselor.rated из camp-service.
     * null = рейтинг ещё не выставлен.
     */
    @Column(precision = 3, scale = 2)
    private BigDecimal rating;

    /**
     * Количество оценок — нужно для корректного пересчёта среднего рейтинга.
     */
    @Builder.Default
    @Column(nullable = false)
    private Integer ratingCount = 0;
}