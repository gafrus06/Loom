package ru.fun.apigateway.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "internal-auth.token-version-cache")
public class TokenVersionCacheProperties {
    private long ttlSeconds = 5;
    private long maxSize = 10_000;
}
