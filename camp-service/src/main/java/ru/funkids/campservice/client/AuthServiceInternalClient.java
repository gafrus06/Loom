package ru.funkids.campservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import ru.funkids.campservice.config.AuthServiceFeignConfig;

import java.util.Map;

/**
 * Feign-клиент camp-service → auth-service.
 * URL не указан — Feign находит сервис через Eureka по имени "auth-service"
 * (должно совпадать с spring.application.name в auth-service).
 *
 * AppConfig пробрасывает X-User-* заголовки из текущего запроса,
 * чтобы auth-service мог идентифицировать вызывающего.
 */
@FeignClient(name = "auth-service", configuration = AuthServiceFeignConfig.class)
public interface AuthServiceInternalClient {

    /**
     * Назначить роль пользователю.
     * Тело: { "userId": "...", "role": "ROLE_PARENT" }
     */
    @PostMapping("/api/auth/internal/assign-role")
    void assignRole(@RequestBody Map<String, String> body);
}