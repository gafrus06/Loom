package ru.fun.apigateway.client;

import com.github.benmanes.caffeine.cache.Ticker;
import org.junit.jupiter.api.Test;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

class AuthInternalClientCacheTest {

    @Test
    void repeatedRequestsHitCache() {
        TestTicker ticker = new TestTicker();
        AtomicInteger liveCalls = new AtomicInteger();
        UUID userId = UUID.randomUUID();

        AuthInternalClient client = new TestAuthInternalClient(
                userId,
                liveCalls,
                new AtomicLong(4L),
                ticker
        );

        assertThat(client.fetchTokenVersion(userId)).isEqualTo(4L);
        assertThat(client.fetchTokenVersion(userId)).isEqualTo(4L);
        assertThat(liveCalls.get()).isEqualTo(1);
    }

    @Test
    void cacheMissFallsBackToLiveLookupAndRefreshesAfterTtl() {
        TestTicker ticker = new TestTicker();
        AtomicInteger liveCalls = new AtomicInteger();
        UUID userId = UUID.randomUUID();
        AtomicLong liveValue = new AtomicLong(3L);

        AuthInternalClient client = new TestAuthInternalClient(userId, liveCalls, liveValue, ticker);

        assertThat(client.fetchTokenVersion(userId)).isEqualTo(3L);
        assertThat(liveCalls.get()).isEqualTo(1);

        liveValue.set(5L);
        ticker.advanceSeconds(6);

        assertThat(client.fetchTokenVersion(userId)).isEqualTo(5L);
        assertThat(liveCalls.get()).isEqualTo(2);
    }

    @Test
    void explicitInvalidationDropsCachedValueImmediately() {
        TestTicker ticker = new TestTicker();
        AtomicInteger liveCalls = new AtomicInteger();
        UUID userId = UUID.randomUUID();
        AtomicLong liveValue = new AtomicLong(1L);

        AuthInternalClient client = new TestAuthInternalClient(userId, liveCalls, liveValue, ticker);

        assertThat(client.fetchTokenVersion(userId)).isEqualTo(1L);
        liveValue.set(2L);
        client.invalidateTokenVersion(userId);

        assertThat(client.fetchTokenVersion(userId)).isEqualTo(2L);
        assertThat(liveCalls.get()).isEqualTo(2);
    }

    private static final class TestAuthInternalClient extends AuthInternalClient {
        private final UUID expectedUserId;
        private final AtomicInteger liveCalls;
        private final AtomicLong liveValue;

        private TestAuthInternalClient(UUID expectedUserId,
                                       AtomicInteger liveCalls,
                                       AtomicLong liveValue,
                                       Ticker ticker) {
            super(WebClient.builder(), "test-secret", 5, 1000, ticker);
            this.expectedUserId = expectedUserId;
            this.liveCalls = liveCalls;
            this.liveValue = liveValue;
        }

        @Override
        protected long fetchTokenVersionLive(UUID userId) {
            assertThat(userId).isEqualTo(expectedUserId);
            liveCalls.incrementAndGet();
            return liveValue.get();
        }
    }

    private static final class TestTicker implements Ticker {
        private long nanos = 0L;

        @Override
        public long read() {
            return nanos;
        }

        void advanceSeconds(long seconds) {
            nanos += TimeUnit.SECONDS.toNanos(seconds);
        }
    }
}
