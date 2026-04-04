package ru.fun.userservice.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

public class AppConfig implements RequestInterceptor {

    private static final Logger log = LoggerFactory.getLogger(AppConfig.class);
    private static final String CALLER_SERVICE = "user-service";

    @Override
    public void apply(RequestTemplate template) {
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            HttpServletRequest request = attrs.getRequest();
            String userId = request.getHeader("X-User-Id");
            String userName = request.getHeader("X-User-Name");
            String userRoles = request.getHeader("X-User-Roles");
            String authHeader = request.getHeader("Authorization");

            if (authHeader != null) {
                template.header("Authorization", authHeader);
            }
            if (userId != null && userName != null && userRoles != null) {
                attachSignedUserHeaders(template, userId, userName, userRoles);
                return;
            }
        }

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof ru.fun.userservice.security.GatewayUserPrincipal principal) {
            attachSignedUserHeaders(template, principal.getUserIdAsString(), principal.getUsername(),
                    auth.getAuthorities().stream().map(a -> a.getAuthority()).reduce((a, b) -> a + "," + b).orElse(""));
            if (auth.getCredentials() instanceof String token && !token.isBlank()) {
                template.header("Authorization", "Bearer " + token);
            }
            return;
        }

        log.warn("Feign: no authenticated user context for path={}", template.path());
    }

    private void attachSignedUserHeaders(RequestTemplate template, String userId, String userName, String userRoles) {
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

    private String normalizePath(String path) {
        return path == null || path.isBlank() ? "/" : path;
    }

    private String sign(String callerService, String method, String path, String subjectType, String timestamp,
                        String userId, String userName, String rolesRaw) {
        try {
            String secret = resolveInternalSecret();
            String payload = callerService + "\n" + subjectType + "\n" + timestamp + "\n" + method + "\n" + path
                    + "\n" + safe(userId) + "\n" + safe(userName) + "\n" + safe(rolesRaw);
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
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

    private String resolveInternalSecret() {
        String fromEnv = System.getenv("INTERNAL_AUTH_SECRET");
        if (fromEnv != null && !fromEnv.isBlank()) {
            return fromEnv;
        }
        return "dev-internal-secret";
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
