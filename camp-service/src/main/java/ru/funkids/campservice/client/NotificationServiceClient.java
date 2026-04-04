package ru.funkids.campservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import ru.funkids.campservice.client.dto.NotificationCreateRequest;
import ru.funkids.campservice.config.NotificationServiceFeignConfig;

@FeignClient(name = "notification-service", configuration = NotificationServiceFeignConfig.class)
public interface NotificationServiceClient {

    @PostMapping("/api/notifications/internal")
    void createInternalNotification(@RequestBody NotificationCreateRequest request);
}
