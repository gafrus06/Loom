package ru.funkids.campservice.config;

import feign.RequestTemplate;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

@Component
public class InternalRequestSigner {

    private final InternalAuthProperties internalAuthProperties;

    public InternalRequestSigner(InternalAuthProperties internalAuthProperties) {
        this.internalAuthProperties = internalAuthProperties;
    }

    public void signInternal(RequestTemplate template, String callerService) {
        String timestamp = String.valueOf(Instant.now().getEpochSecond());
        String path = template.path() == null || template.path().isBlank() ? "/" : template.path();
        String method = template.method() == null ? "GET" : template.method();
        String signature = sign(callerService, method, path, timestamp);

        template.header("X-Caller-Service", callerService);
        template.header("X-Internal-Timestamp", timestamp);
        template.header("X-Internal-Signature", signature);
    }

    private String sign(String callerService, String method, String path, String timestamp) {
        try {
            String secret = resolveInternalSecret();
            String payload = callerService + "\ninternal\n" + timestamp + "\n" + method + "\n" + path + "\n\n\n";

            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));

            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);

            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }

            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to sign internal request", e);
        }
    }

    private String resolveInternalSecret() {
        String secret = internalAuthProperties.getSecret();
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException("internal-auth.secret must be configured");
        }
        return secret;
    }
}