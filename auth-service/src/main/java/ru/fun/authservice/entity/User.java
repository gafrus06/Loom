package ru.fun.authservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.GenericGenerator;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Пользователь системы.
 *
 * Роли хранятся в отдельной таблице user_roles через сущность UserRole.
 * Это позволяет хранить метаданные: кто назначил, когда, активна ли роль.
 *
 * Для генерации JWT используется getActiveRoleNames() —
 * возвращает только активные роли в виде строк.
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(of = "id")
@ToString(exclude = "userRoles")
public class User {

    @Id
    @GeneratedValue(generator = "UUID")
    @GenericGenerator(name = "UUID", strategy = "org.hibernate.id.UUIDGenerator")
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    /**
     * Деактивированный пользователь не может войти в систему,
     * но его данные сохраняются.
     */
    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "token_version", nullable = false)
    @Builder.Default
    private long tokenVersion = 0L;

    @Column(name = "created_at", nullable = false, updatable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    /**
     * Все назначения ролей (включая отозванные).
     * Для JWT используй getActiveRoleNames().
     */
    @OneToMany(
            mappedBy = "user",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.EAGER
    )
    @Builder.Default
    private Set<UserRole> userRoles = new HashSet<>();

    /**
     * Возвращает только активные роли в виде строк для JWT.
     * Например: ["ROLE_USER", "ROLE_ADMIN"]
     */
    public Set<String> getActiveRoleNames() {
        return userRoles.stream()
                .filter(UserRole::isActive)
                .map(UserRole::getRole)
                .collect(Collectors.toSet());
    }

    /**
     * Проверяет, есть ли у пользователя активная роль.
     */
    public boolean hasRole(String roleName) {
        return userRoles.stream()
                .anyMatch(ur -> ur.isActive() && ur.getRole().equals(roleName));
    }

    /**
     * Проверяет, есть ли у пользователя роль SUPER_ADMIN.
     */
    public boolean isSuperAdmin() {
        return hasRole(AppRole.ROLE_SUPER_ADMIN.value());
    }
}
