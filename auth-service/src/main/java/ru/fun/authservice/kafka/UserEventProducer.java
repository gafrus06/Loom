package ru.fun.authservice.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import ru.fun.authservice.dto.UserRegisteredEvent;
import ru.fun.authservice.dto.UserRoleChangedEvent;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserEventProducer {

    private static final String TOPIC_USER_REGISTERED = "user.registered";
    private static final String TOPIC_USER_ROLE_ASSIGNED = "user.role-assigned";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    @Async
    public void publishUserRegistered(UserRegisteredEvent event) {
        kafkaTemplate.send(TOPIC_USER_REGISTERED, event.getUserId(), event)
                .whenComplete((result, ex) -> {
                    if (ex == null) {
                        log.info("✅ Sent UserRegisteredEvent for userId={} to topic={}",
                                event.getUserId(), TOPIC_USER_REGISTERED);
                    } else {
                        log.error("❌ Failed to send UserRegisteredEvent for userId={} to topic={}",
                                event.getUserId(), TOPIC_USER_REGISTERED, ex);
                    }
                });
    }

    @Async
    public void publishUserRoleChanged(UserRoleChangedEvent event) {
        kafkaTemplate.send(TOPIC_USER_ROLE_ASSIGNED, event.getUserId(), event)
                .whenComplete((result, ex) -> {
                    if (ex == null) {
                        log.info("✅ Sent UserRoleChangedEvent for userId={} to topic={}",
                                event.getUserId(), TOPIC_USER_ROLE_ASSIGNED);
                    } else {
                        log.error("❌ Failed to send UserRoleChangedEvent for userId={} to topic={}",
                                event.getUserId(), TOPIC_USER_ROLE_ASSIGNED, ex);
                    }
                });
    }

}
