package ru.funkids.newsfeedservice.config;

import feign.RequestInterceptor;
import feign.codec.ErrorDecoder;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Пробрасывает заголовки авторизации из входящего запроса
 * во все исходящие Feign-вызовы (к camp-service, user-service и т.д.).
 * Сервисы работают через Eureka (lb://service-name) — IP не нужен.
 */
@Configuration
public class FeignConfig {

    @Bean
    public RequestInterceptor gatewayHeadersInterceptor() {
        return template -> {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs == null) return;

            HttpServletRequest request = attrs.getRequest();
            copyHeader(request, template, "Authorization");
            copyHeader(request, template, "X-User-Id");
            copyHeader(request, template, "X-User-Name");
            copyHeader(request, template, "X-User-Roles");
        };
    }

    private void copyHeader(HttpServletRequest request, feign.RequestTemplate template, String name) {
        String value = request.getHeader(name);
        if (value != null) template.header(name, value);
    }

    @Bean
    public ErrorDecoder errorDecoder() {
        return (methodKey, response) ->
                new RuntimeException("Feign error: " + response.status() + " on " + methodKey);
    }
}