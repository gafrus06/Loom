package ru.fun.authservice.kafka;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import ru.fun.authservice.dto.UserRegisteredEvent;
import ru.fun.authservice.dto.UserRoleChangedEvent;

import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserEventProducer {

    private static final String TOPIC_USER_REGISTERED = "user.registered";
    private static final String TOPIC_USER_ROLE_ASSIGNED = "user.role-assigned";

    private final KafkaTemplate<String, Object> kafkaTemplate;

    public void publishUserRegistered(UserRegisteredEvent event) throws Exception {
        kafkaTemplate.send(TOPIC_USER_REGISTERED, event.getUserId(), event)
                .get(10, TimeUnit.SECONDS);
        log.info("Sent UserRegisteredEvent for userId={} to topic={}",
                event.getUserId(), TOPIC_USER_REGISTERED);
    }

    public void publishUserRoleChanged(UserRoleChangedEvent event) throws Exception {
        kafkaTemplate.send(TOPIC_USER_ROLE_ASSIGNED, event.getUserId(), event)
                .get(10, TimeUnit.SECONDS);
        log.info("Sent UserRoleChangedEvent for userId={} to topic={}",
                event.getUserId(), TOPIC_USER_ROLE_ASSIGNED);
    }
}
