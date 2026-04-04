package ru.fun.authservice.security;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

@Component
public class InternalRequestVerifier {

    private static final String HEADER_CALLER_SERVICE = "X-Caller-Service";
    private static final String HEADER_INTERNAL_TIMESTAMP = "X-Internal-Timestamp";
    private static final String HEADER_INTERNAL_SIGNATURE = "X-Internal-Signature";
    private static final long MAX_SKEW_SECONDS = 60;

    @Value("${internal-auth.secret:${INTERNAL_AUTH_SECRET:}}")
    private String internalAuthSecret;

    @PostConstruct
    void validateSecret() {
        if (internalAuthSecret == null || internalAuthSecret.isBlank()) {
            throw new IllegalStateException("internal-auth.secret must be configured");
        }
    }

    public String requireVerifiedInternalCaller(HttpServletRequest request) {
        String callerService = request.getHeader(HEADER_CALLER_SERVICE);
        String timestamp = request.getHeader(HEADER_INTERNAL_TIMESTAMP);
        String signature = request.getHeader(HEADER_INTERNAL_SIGNATURE);
        if (isBlank(callerService) || isBlank(timestamp) || isBlank(signature)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Missing internal proof");
        }

        long ts;
        try {
            ts = Long.parseLong(timestamp);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid internal proof");
        }

        if (Math.abs(Instant.now().getEpochSecond() - ts) > MAX_SKEW_SECONDS) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Expired internal proof");
        }

        String expected = sign(callerService, request.getMethod(), request.getRequestURI(), timestamp);
        if (!constantTimeEquals(expected, signature)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Invalid internal proof");
        }
        return callerService;
    }

    private String sign(String callerService, String method, String path, String timestamp) {
        try {
            String payload = callerService + "\ninternal\n" + timestamp + "\n" + method + "\n" + path + "\n\n\n";
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(internalAuthSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to verify internal proof", e);
        }
    }

    private boolean constantTimeEquals(String left, String right) {
        byte[] a = left.getBytes(StandardCharsets.UTF_8);
        byte[] b = right.getBytes(StandardCharsets.UTF_8);
        if (a.length != b.length) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < a.length; i++) {
            result |= a[i] ^ b[i];
        }
        return result == 0;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
