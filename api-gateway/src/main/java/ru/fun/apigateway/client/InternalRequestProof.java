package ru.fun.apigateway.client;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

final class InternalRequestProof {

    private InternalRequestProof() {
    }

    static String sign(String secret, String callerService, String method, String path, String timestamp) {
        try {
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
}
