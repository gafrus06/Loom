package ru.funkids.notificationservice;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.test.util.ReflectionTestUtils;
import ru.funkids.notificationservice.service.OtpService;
import ru.funkids.notificationservice.sms.OtpChannel;

import java.time.Duration;
import java.util.List;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OtpServiceTest {

    @Mock private StringRedisTemplate redis;
    @Mock private ValueOperations<String, String> valueOperations;
    @Mock private OtpChannel otpChannel;

    @InjectMocks
    private OtpService otpService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(otpService, "ttlSec", 300L);
        ReflectionTestUtils.setField(otpService, "codeLength", 4);
        ReflectionTestUtils.setField(otpService, "charset", "digits");
    }

    @Test
    void createAndSendStoresOtpUnderUserScopedKey() {
        UUID userId = UUID.randomUUID();
        String phone = "+79990001122";
        when(redis.opsForValue()).thenReturn(valueOperations);

        otpService.createAndSend(userId, phone);

        ArgumentCaptor<String> keyCaptor = ArgumentCaptor.forClass(String.class);
        verify(valueOperations).set(keyCaptor.capture(), anyString(), eq(Duration.ofSeconds(300)));
        verify(otpChannel).sendCode(eq(phone), anyString());
        assertTrue(keyCaptor.getValue().contains(userId.toString()));
    }

    @Test
    void verifyUsesAtomicCompareAndDeleteForSpecificUserPhonePair() {
        UUID userId = UUID.randomUUID();
        String phone = "+79990001122";
        when(redis.execute(any(DefaultRedisScript.class), anyList(), eq("1234"))).thenReturn(1L);

        assertTrue(otpService.verify(userId, phone, "1234"));

        verify(redis).execute(any(DefaultRedisScript.class), eq(List.of("otp:user:" + userId + ":phone:" + phone)), eq("1234"));
    }
}
