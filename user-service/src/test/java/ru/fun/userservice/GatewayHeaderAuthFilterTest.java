package ru.fun.userservice;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import ru.fun.userservice.security.GatewayHeaderAuthFilter;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;

class GatewayHeaderAuthFilterTest {

    private static final String SECRET = "test-secret";

    private final GatewayHeaderAuthFilter filter = new GatewayHeaderAuthFilter();

    GatewayHeaderAuthFilterTest() {
        ReflectionTestUtils.setField(filter, "internalAuthSecret", SECRET);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void rejectsSpoofedHeadersWithoutSignature() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/users/profile");
        request.addHeader("X-User-Id", "00000000-0000-0000-0000-000000000001");
        request.addHeader("X-User-Name", "spoof");
        request.addHeader("X-User-Roles", "ROLE_USER");

        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(401);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    void acceptsSignedHeaders() throws Exception {
        String userId = "00000000-0000-0000-0000-000000000001";
        String userName = "user";
        String roles = "ROLE_USER";
        String caller = "api-gateway";
        String timestamp = String.valueOf(java.time.Instant.now().getEpochSecond());
        String path = "/api/users/profile";

        MockHttpServletRequest request = new MockHttpServletRequest("GET", path);
        request.addHeader("X-User-Id", userId);
        request.addHeader("X-User-Name", userName);
        request.addHeader("X-User-Roles", roles);
        request.addHeader("X-Caller-Service", caller);
        request.addHeader("X-Internal-Timestamp", timestamp);
        request.addHeader("X-Internal-Signature", sign(caller, "GET", path, timestamp, userId, userName, roles));

        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());

        assertThat(response.getStatus()).isEqualTo(200);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    private String sign(String caller, String method, String path, String timestamp,
                        String userId, String userName, String roles) throws Exception {
        String payload = caller + "\nuser\n" + timestamp + "\n" + method + "\n" + path
                + "\n" + userId + "\n" + userName + "\n" + roles;
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        StringBuilder hex = new StringBuilder(digest.length * 2);
        for (byte b : digest) {
            hex.append(String.format("%02x", b));
        }
        return hex.toString();
    }
}
