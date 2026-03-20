package ru.funkids.notificationservice.sms.Impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import ru.funkids.notificationservice.sms.OtpChannel;

import java.util.HashMap;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(prefix = "sms", name = "provider", havingValue = "greensms_telegram")
public class GreenSmsTelegramSender implements OtpChannel {

    @Value("${sms.greensms.base-url:https://api3.greensms.ru}")
    private String baseUrl;

    @Value("${sms.greensms.token}")
    private String bearerToken;

    @Value("${sms.greensms.tag:}")
    private String tag;

    private final RestClient rest = RestClient.builder().build();

    @Override
    public void sendCode(String phone, String code) {

        String url = baseUrl + "/telegram/send";

        Map<String, Object> body = new HashMap<>();
        body.put("to", normalizeRuPhone(phone));
        body.put("txt", code);
        if (tag != null && !tag.isBlank()) body.put("tag", tag);

        try {
            String response = rest.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .header("Authorization", "Bearer " + bearerToken)
                    .body(body)
                    .retrieve()
                    .body(String.class);
            log.info("✅ GreenSMS telegram/send to {} -> {}", phone, response);
        } catch (Exception e) {
            log.error("❌ GreenSMS telegram/send failed for {}: {}", phone, e.getMessage(), e);
            throw e;
        }
    }

    private String normalizeRuPhone(String raw) {
        if (raw == null) return null;
        String p = raw.replaceAll("\\D", "");
        if (p.startsWith("8") && p.length() == 11) return "7" + p.substring(1);
        if (p.startsWith("7") && p.length() == 11) return p;
        if (p.startsWith("9") && p.length() == 10) return "7" + p;
        if (raw.startsWith("+7") && p.length() == 11) return p;
        return p;
    }
}
