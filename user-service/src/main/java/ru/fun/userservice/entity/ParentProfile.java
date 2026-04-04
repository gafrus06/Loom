package ru.fun.userservice.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Профиль родителя.
 *
 * Создаётся автоматически при получении события user.role.changed
 * с action=ASSIGNED и role=ROLE_PARENT.
 *
 * Поля по плану (раздел 6.3):
 *   - дополнительные контактные данные
 *   - экстренные контакты
 *   - комментарии
 */
@Entity
@Table(name = "parents")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString(exclude = "userProfile")
public class ParentProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserProfile userProfile;

    // ── Экстренные контакты ───────────────────────────────────────────────────

    @Column(length = 200)
    private String emergencyContactName;

    @Column(length = 20)
    private String emergencyContactPhone;

    /**
     * Связь экстренного контакта с ребёнком (мать, отец, бабушка и т.д.)
     */
    @Column(length = 100)
    private String emergencyContactRelation;

    // ── Дополнительные данные ─────────────────────────────────────────────────

    @Column(length = 255)
    private String address;

    /**
     * Внутренние комментарии — видны только вожатым и администраторам.
     */
    @Column(columnDefinition = "text")
    private String notes;
}