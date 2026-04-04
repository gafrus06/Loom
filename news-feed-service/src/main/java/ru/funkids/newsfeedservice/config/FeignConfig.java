package ru.funkids.newsfeedservice.config;

import feign.RequestInterceptor;
import feign.codec.ErrorDecoder;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

@Configuration
public class FeignConfig {

    private static final String CALLER_SERVICE = "news-feed-service";

    @Value("${internal-auth.secret:${INTERNAL_AUTH_SECRET:}}")
    private String internalAuthSecret;

    @Bean
    public RequestInterceptor gatewayHeadersInterceptor() {
        return template -> {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) {
                return;
            }

            HttpServletRequest request = attrs.getRequest();
            copyHeader(request, template, "Authorization");

            String userId = request.getHeader("X-User-Id");
            String userName = request.getHeader("X-User-Name");
            String userRoles = request.getHeader("X-User-Roles");
            if (userId != null && userName != null && userRoles != null) {
                String timestamp = String.valueOf(Instant.now().getEpochSecond());
                String method = template.method() != null ? template.method() : "GET";
                String path = normalizePath(template.path());
                template.header("X-User-Id", userId);
                template.header("X-User-Name", userName);
                template.header("X-User-Roles", userRoles);
                template.header("X-Caller-Service", CALLER_SERVICE);
                template.header("X-Internal-Timestamp", timestamp);
                template.header("X-Internal-Signature",
                        sign(CALLER_SERVICE, method, path, "user", timestamp, userId, userName, userRoles));
            }
        };
    }

    private void copyHeader(HttpServletRequest request, feign.RequestTemplate template, String name) {
        String value = request.getHeader(name);
        if (value != null) {
            template.header(name, value);
        }
    }

    private String normalizePath(String path) {
        return path == null || path.isBlank() ? "/" : path;
    }

    private String sign(String callerService, String method, String path, String subjectType, String timestamp,
                        String userId, String userName, String rolesRaw) {
        try {
            String payload = callerService + "\n" + subjectType + "\n" + timestamp + "\n" + method + "\n" + path
                    + "\n" + safe(userId) + "\n" + safe(userName) + "\n" + safe(rolesRaw);
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(requireInternalSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to sign internal user headers", e);
        }
    }

    private String requireInternalSecret() {
        if (internalAuthSecret == null || internalAuthSecret.isBlank()) {
            throw new IllegalStateException("internal-auth.secret must be configured");
        }
        return internalAuthSecret;
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }

    @Bean
    public ErrorDecoder errorDecoder() {
        return (methodKey, response) ->
                new RuntimeException("Feign error: " + response.status() + " on " + methodKey);
    }
}
