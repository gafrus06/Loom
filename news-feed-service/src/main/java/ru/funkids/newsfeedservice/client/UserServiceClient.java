package ru.funkids.newsfeedservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import ru.funkids.newsfeedservice.config.FeignConfig;
import ru.funkids.newsfeedservice.dto.client.UserProfileDto;

import java.util.List;
import java.util.UUID;

/**
 * Обращается к user-service через Eureka (lb://user-service).
 */
@FeignClient(name = "user-service", configuration = FeignConfig.class)
public interface UserServiceClient {

    @GetMapping("/api/users/{id}")
    UserProfileDto getUserProfile(@PathVariable("id") UUID userId);

    @PostMapping("/api/users/bulk")
    List<UserProfileDto> getUserProfiles(@RequestBody List<UUID> userIds);

    /**
     * Возвращает fileId аватарки пользователя (UUID в виде строки).
     * Если аватарки нет — возвращает null или пустую строку.
     */
    @GetMapping("/api/users/{id}/avatar")
    String getUserAvatar(@PathVariable("id") UUID userId);
}
