package ru.funkids.notificationservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;
import ru.funkids.notificationservice.sms.OtpChannel;

import java.security.SecureRandom;
import java.time.Duration;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class OtpService {
    private static final DefaultRedisScript<Long> COMPARE_AND_DELETE_SCRIPT = new DefaultRedisScript<>(
            "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) else return 0 end",
            Long.class
    );

    private final StringRedisTemplate redis;
    private final OtpChannel channel;
    private final SecureRandom rnd = new SecureRandom();

    @Value("${otp.ttl-seconds:300}")
    private long ttlSec;

    @Value("${otp.code-length:6}")
    private int codeLength;

    @Value("${otp.charset:digits}")
    private String charset;

    private String key(UUID userId, String phone) {
        return "otp:user:" + userId + ":phone:" + phone;
    }

    public void createAndSend(UUID userId, String phone) {
        String code = generateCode(codeLength, charset).toUpperCase();
        redis.opsForValue().set(key(userId, phone), code, Duration.ofSeconds(ttlSec));
        channel.sendCode(phone, code);
        log.debug("OTP for user={} phone={} stored TTL={}s len={} charset={}",
                userId, phone, ttlSec, codeLength, charset);
    }

    public boolean verify(UUID userId, String phone, String code) {
        Long result = redis.execute(COMPARE_AND_DELETE_SCRIPT, List.of(key(userId, phone)), code);
        return result != null && result > 0;
    }

    public long ttl(UUID userId, String phone) {
        Long sec = redis.getExpire(key(userId, phone), TimeUnit.SECONDS);
        return sec == null ? -2 : sec;
    }

    private String generateCode(int len, String mode) {
        final String digits = "0123456789";
        final String letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        final String alnum = digits + letters;

        String alphabet = switch (mode.toLowerCase()) {
            case "letters" -> letters;
            case "alnum" -> alnum;
            default -> digits;
        };

        StringBuilder sb = new StringBuilder(len);
        for (int i = 0; i < len; i++) {
            sb.append(alphabet.charAt(rnd.nextInt(alphabet.length())));
        }
        return sb.toString();
    }
}
