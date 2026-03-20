package ru.fun.userservice.rest.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import ru.fun.userservice.config.AppConfig;
import ru.fun.userservice.dto.notification.PhoneVerificationConfirmRequest;
import ru.fun.userservice.dto.notification.VerifyResponse;

/**
 * url убран — Feign ищет через Eureka по имени "notification-service".
 */
@FeignClient(name = "notification-service", configuration = AppConfig.class)
public interface NotificationClient {

    @PostMapping("/api/notifications/phone/verify")
    VerifyResponse verify(@RequestBody PhoneVerificationConfirmRequest req);
}