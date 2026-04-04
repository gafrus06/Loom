package ru.fun.authservice;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;
import ru.fun.authservice.security.InternalRequestVerifier;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class InternalRequestVerifierTest {

    private static final String SECRET = "internal-proof-test-secret";

    private final InternalRequestVerifier verifier = new InternalRequestVerifier();

    InternalRequestVerifierTest() {
        ReflectionTestUtils.setField(verifier, "internalAuthSecret", SECRET);
    }

    @Test
    void rejectsMissingInternalProof() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/internal/assign-role");

        assertThatThrownBy(() -> verifier.requireVerifiedInternalCaller(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("403 FORBIDDEN");
    }

    @Test
    void acceptsSignedInternalProof() throws Exception {
        String caller = "camp-service";
        String path = "/api/auth/internal/assign-role";
        String timestamp = String.valueOf(Instant.now().getEpochSecond());

        MockHttpServletRequest request = new MockHttpServletRequest("POST", path);
        request.addHeader("X-Caller-Service", caller);
        request.addHeader("X-Internal-Timestamp", timestamp);
        request.addHeader("X-Internal-Signature", sign(caller, "POST", path, timestamp));

        assertThat(verifier.requireVerifiedInternalCaller(request)).isEqualTo("camp-service");
    }

    private String sign(String caller, String method, String path, String timestamp) throws Exception {
        String payload = caller + "\ninternal\n" + timestamp + "\n" + method + "\n" + path + "\n\n\n";
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
