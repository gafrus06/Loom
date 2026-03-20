package ru.fun.apigateway.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Настройки Rate Limiting из application.yml → rate-limit.*
 *
 * replenish-rate  — токенов в секунду (средняя скорость)
 * burst-capacity  — максимум токенов в ведре (пик)
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "rate-limit")
public class RateLimitProperties {
    private int replenishRate = 20;
    private int burstCapacity = 40;
}