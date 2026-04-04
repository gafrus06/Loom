package ru.funkids.notificationservice.kafka;

import lombok.RequiredArgsConstructor;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.stereotype.Component;
import ru.funkids.notificationservice.service.DeadLetterOperationsService;

@Component
@RequiredArgsConstructor
public class NotificationDeadLetterListener {

    private static final String SERVICE_NAME = "notification-service";

    private final DeadLetterOperationsService deadLetterOperationsService;

    @KafkaListener(
            topics = {"user.phone.verification.start.DLT", "notification.internal.requested.DLT"},
            groupId = "${kafka.consumer.group-id}-dlt",
            containerFactory = "stringKafkaListenerContainerFactory"
    )
    public void onDeadLetter(String payload,
                             @Header(KafkaHeaders.RECEIVED_TOPIC) String dltTopic,
                             @Header(KafkaHeaders.RECEIVED_KEY) String key,
                             @Header(name = KafkaHeaders.DLT_ORIGINAL_TOPIC, required = false) String originalTopic,
                             @Header(name = KafkaHeaders.DLT_EXCEPTION_FQCN, required = false) String exceptionClass,
                             @Header(name = KafkaHeaders.DLT_EXCEPTION_MESSAGE, required = false) String exceptionMessage) {
        deadLetterOperationsService.store(
                SERVICE_NAME,
                originalTopic == null ? dltTopic.replace(".DLT", "") : originalTopic,
                dltTopic,
                key,
                payload,
                exceptionClass,
                exceptionMessage
        );
    }
}
