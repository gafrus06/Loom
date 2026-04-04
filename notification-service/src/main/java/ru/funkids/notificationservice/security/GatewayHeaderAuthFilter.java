package ru.funkids.notificationservice.security;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

@Component
public class GatewayHeaderAuthFilter extends OncePerRequestFilter {

    private static final String HEADER_USER_ID = "X-User-Id";
    private static final String HEADER_USER_NAME = "X-User-Name";
    private static final String HEADER_USER_ROLES = "X-User-Roles";
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

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {
        String userId = request.getHeader(HEADER_USER_ID);
        String userName = request.getHeader(HEADER_USER_NAME);
        String rolesRaw = request.getHeader(HEADER_USER_ROLES);

        if (userId != null || userName != null || rolesRaw != null) {
            if (!isValidSignedUserRequest(request, userId, userName, rolesRaw)) {
                response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Invalid internal auth headers");
                return;
            }

            if (SecurityContextHolder.getContext().getAuthentication() == null) {
                Set<String> roles = new HashSet<>(Arrays.asList(safe(rolesRaw).split(",")));
                roles.removeIf(String::isBlank);
                GatewayUserPrincipal principal = new GatewayUserPrincipal(userId, userName, roles);
                UsernamePasswordAuthenticationToken auth =
                        new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
                SecurityContextHolder.getContext().setAuthentication(auth);
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isValidSignedUserRequest(HttpServletRequest request,
                                             String userId,
                                             String userName,
                                             String rolesRaw) {
        String callerService = request.getHeader(HEADER_CALLER_SERVICE);
        String timestamp = request.getHeader(HEADER_INTERNAL_TIMESTAMP);
        String signature = request.getHeader(HEADER_INTERNAL_SIGNATURE);
        if (isBlank(callerService) || isBlank(timestamp) || isBlank(signature)
                || isBlank(userId) || userName == null || rolesRaw == null) {
            return false;
        }

        long ts;
        try {
            ts = Long.parseLong(timestamp);
        } catch (NumberFormatException ex) {
            return false;
        }
        if (Math.abs(Instant.now().getEpochSecond() - ts) > MAX_SKEW_SECONDS) {
            return false;
        }

        String expected = sign(callerService, request.getMethod(), request.getRequestURI(), "user", timestamp, userId, userName, rolesRaw);
        return constantTimeEquals(expected, signature);
    }

    private String sign(String callerService, String method, String path, String subjectType, String timestamp,
                        String userId, String userName, String rolesRaw) {
        try {
            String payload = callerService + "\n" + subjectType + "\n" + timestamp + "\n" + method + "\n" + path
                    + "\n" + safe(userId) + "\n" + safe(userName) + "\n" + safe(rolesRaw);
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(internalAuthSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(String.format("%02x", b));
            }
            return hex.toString();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to verify internal auth headers", e);
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

    private String safe(String value) {
        return value == null ? "" : value;
    }
}
