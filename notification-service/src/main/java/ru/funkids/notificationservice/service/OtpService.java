
package ru.funkids.notificationservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import ru.funkids.notificationservice.sms.OtpChannel;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {
    private final StringRedisTemplate redis;
    private final OtpChannel channel;
    private final SecureRandom rnd = new SecureRandom();

    @Value("${otp.ttl-seconds:300}")
    private long ttlSec;

    @Value("${otp.code-length:6}")
    private int codeLength;

    @Value("${otp.charset:digits}")
    private String charset;

    private String key(String phone) { return "otp:phone:" + phone; }

    public void createAndSend(String phone) {
        String code = generateCode(codeLength, charset).toUpperCase();
        redis.opsForValue().set(key(phone), code, Duration.ofSeconds(ttlSec));
        channel.sendCode(phone, code);
        log.debug("OTP for {} stored TTL={}s len={} charset={}", phone, ttlSec, codeLength, charset);
    }

    public boolean verify(String phone, String code) {
        String k = key(phone);
        String stored = redis.opsForValue().get(k);
        if (stored == null) return false;
        boolean ok = stored.equalsIgnoreCase(code);
        if (ok) redis.delete(k);
        return ok;
    }

    public long ttl(String phone) {
        Long sec = redis.getExpire(key(phone), TimeUnit.SECONDS);
        return sec == null ? -2 : sec;
    }

    private String generateCode(int len, String mode) {
        final String DIGITS = "0123456789";
        final String LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        final String ALNUM = DIGITS + LETTERS;

        String alphabet = switch (mode.toLowerCase()) {
            case "letters" -> LETTERS;
            case "alnum"   -> ALNUM;
            default        -> DIGITS;
        };

        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(alphabet.charAt(rnd.nextInt(alphabet.length())));
        }
        return sb.toString();
    }
}
