package ru.fun.apigateway.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;

import java.util.List;

/**
 * Наши кастомные настройки шлюза.
 * Намеренно назван AppGatewayProperties, а не GatewayProperties —
 * чтобы не конфликтовать с внутренним бином Spring Cloud Gateway.
 *
 * Читается из application.yml → app.gateway.*
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.gateway")
public class AppGatewayProperties {

    /**
     * Список Ant-паттернов публичных путей (без JWT).
     * Пример: /api/auth/**, /actuator/health
     */
    private List<String> publicPaths = List.of("/api/auth/**");

    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    public boolean isPublic(String path) {
        return publicPaths.stream()
                .anyMatch(pattern -> pathMatcher.match(pattern, path));
    }
}