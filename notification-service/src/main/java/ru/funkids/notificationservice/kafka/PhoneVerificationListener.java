package ru.funkids.notificationservice.kafka;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import ru.funkids.notificationservice.dto.PhoneVerificationStartEvent;
import ru.funkids.notificationservice.service.OtpService;


@Slf4j
@Component
@RequiredArgsConstructor
public class PhoneVerificationListener {

    private final ObjectMapper om;
    private final OtpService otpService;

    @KafkaListener(topics = "${topics.phoneVerificationStart}", groupId = "notification-service")
    public void onStart(String json) {
        try {
            PhoneVerificationStartEvent evt = om.readValue(json, PhoneVerificationStartEvent.class);
            log.info("📥 phone verification start for user={} phone={}", evt.getUserId(), evt.getPhone());
            otpService.createAndSend(evt.getPhone());
        } catch (Exception e) {
            log.error("failed to process start event: {}", e.getMessage(), e);
        }
    }
}

