package ru.fun.userservice.config;

import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.Jackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.RedisSerializer;
import ru.fun.userservice.dto.CounselorProfileDto;

import java.time.Duration;

@Configuration
@EnableCaching
public class RedisConfig {

    public static final class CacheNames {
        public static final String COUNSELOR_BY_USER_ID = "counselor:byUserId";
    }

    @Bean
    public RedisCacheManager redisCacheManager(RedisConnectionFactory cf) {
        // дефолтный универсальный сериализатор с типовой инфой
        var baseSerializer = new GenericJackson2JsonRedisSerializer();

        var base = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofHours(1))
                .disableCachingNullValues()
                .serializeKeysWith(RedisSerializationContext.SerializationPair.fromSerializer(RedisSerializer.string()))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(baseSerializer))
                .prefixCacheNameWith("user-service:");

        // типобезопасный сериализатор именно для CounselorProfileDto
        var counselorSerializer = new Jackson2JsonRedisSerializer<>(CounselorProfileDto.class);

        var counselorCfg = base
                .entryTtl(Duration.ofMinutes(30))
                .serializeValuesWith(RedisSerializationContext.SerializationPair.fromSerializer(counselorSerializer));

        return RedisCacheManager.builder(cf)
                .cacheDefaults(base)
                .withCacheConfiguration(CacheNames.COUNSELOR_BY_USER_ID, counselorCfg)
                .build();
    }

}
