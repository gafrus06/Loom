package ru.fun.userservice.rest.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import ru.fun.userservice.config.AppConfig;
import ru.fun.userservice.dto.auth.UserRolesResponse;

import java.util.UUID;

/**
 * Feign-клиент для auth-service.
 *
 * Используется в UserProfileFacade.getUserProfileById() —
 * когда нужно получить роли пользователя по его ID
 * (например, при просмотре чужого профиля).
 *
 * В остальных случаях роли приходят из JWT заголовка X-User-Roles
 * через GatewayUserPrincipal — Feign не нужен.
 */
@FeignClient(name = "auth-service", configuration = AppConfig.class)
public interface AuthServiceClient {

    /**
     * Получить активные роли пользователя с метаданными.
     * Возвращает UserRolesResponse с List<UserRoleDto>.
     * Для получения просто списка строк используй response.getRoleNames().
     */
    @GetMapping("/api/auth/users/{userId}/roles")
    UserRolesResponse getRolesByUserId(@PathVariable UUID userId);
}