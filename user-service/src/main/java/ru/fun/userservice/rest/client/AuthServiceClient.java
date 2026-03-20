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
 * url убран — Feign ищет сервис через Eureka по имени "auth-service".
 * При репликах Spring Cloud LoadBalancer автоматически балансирует между ними.
 */
@FeignClient(name = "auth-service", configuration = AppConfig.class)
public interface AuthServiceClient {

    @GetMapping("/api/auth/users/{userId}/roles")
    UserRolesResponse getRolesByUserId(@PathVariable UUID userId);
}