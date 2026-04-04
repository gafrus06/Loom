package ru.funkids.campservice.config;

import feign.RequestTemplate;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

final class InternalRequestSigner {

    private InternalRequestSigner() {
    }

    static void signInternal(RequestTemplate template, String callerService) {
        String timestamp = String.valueOf(Instant.now().getEpochSecond());
        String path = template.path() == null || template.path().isBlank() ? "/" : template.path();
        String method = template.method() == null ? "GET" : template.method();
        String signature = sign(callerService, method, path, timestamp);
        template.header("X-Caller-Service", callerService);
        template.header("X-Internal-Timestamp", timestamp);
        template.header("X-Internal-Signature", signature);
    }

    private static String sign(String callerService, String method, String path, String timestamp) {
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

    private static String resolveInternalSecret() {
        String fromEnv = System.getenv("INTERNAL_AUTH_SECRET");
        if (fromEnv == null || fromEnv.isBlank()) {
            throw new IllegalStateException("INTERNAL_AUTH_SECRET must be configured");
        }
        return fromEnv;
    }
}
