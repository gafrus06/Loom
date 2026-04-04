package ru.fun.userservice.entity;

import jakarta.persistence.*;
import lombok.*;

/**
 * Профиль администратора лагеря.
 *
 * Создаётся автоматически при получении события user.role.changed
 * с action=ASSIGNED и role=ROLE_ADMIN.
 *
 * Удаляется при action=REMOVED и role=ROLE_ADMIN.
 *
 * ROLE_SUPER_ADMIN — это просто роль в auth-service.
 * Никакой отдельной сущности для SUPER_ADMIN не создаётся.
 * SUPER_ADMIN может иметь AdminProfile если он также является администратором лагеря,
 * но это не обязательно.
 */
@Entity
@Table(name = "admin_profiles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString(exclude = "userProfile")
public class AdminProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private UserProfile userProfile;

    // Можно добавить поля в будущем: должность, организация и т.д.
}