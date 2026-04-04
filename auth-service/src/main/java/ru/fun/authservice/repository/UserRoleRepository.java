package ru.fun.authservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.fun.authservice.entity.UserRole;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRoleRepository extends JpaRepository<UserRole, UUID> {

    /**
     * Все активные роли пользователя.
     */
    List<UserRole> findByUserIdAndActiveTrue(UUID userId);

    /**
     * Найти конкретную активную роль пользователя.
     * Используется при проверке прав на удаление: кто назначил?
     */
    Optional<UserRole> findByUserIdAndRoleAndActiveTrue(UUID userId, String role);

    Optional<UserRole> findByUserIdAndRoleAndActiveFalse(UUID userId, String role);

    List<UserRole> findByUserIdAndRole(UUID userId, String role);

    /**
     * Существует ли у пользователя активная роль?
     */
    boolean existsByUserIdAndRoleAndActiveTrue(UUID userId, String role);

    /**
     * Все роли (включая отозванные) — для аудита.
     */
    List<UserRole> findByUserId(UUID userId);

    /**
     * Все активные назначения конкретной роли в системе.
     * Используется SUPER_ADMIN для просмотра всех администраторов.
     */
    @Query("SELECT ur FROM UserRole ur WHERE ur.role = :role AND ur.active = true")
    List<UserRole> findAllActiveByRole(@Param("role") String role);

    /**
     * Сколько активных пользователей с данной ролью назначил конкретный пользователь.
     * Используется при деактивации назначающего — для проверки "осиротевших" ролей.
     */
    @Query("SELECT ur FROM UserRole ur WHERE ur.assignedByUserId = :assignedBy AND ur.active = true")
    List<UserRole> findAllActiveAssignedBy(@Param("assignedBy") UUID assignedByUserId);

    UserRole findByRole(String role);
}
