package ru.fun.userservice.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * Feign конфигурация — реализует RequestInterceptor напрямую.
 *
 * ВАЖНО: НЕТ @Configuration и НЕТ @Bean.
 * Когда класс указан в @FeignClient(configuration = ...), Spring Feign
 * инстанциирует его сам и вызывает методы, реализующие Feign-интерфейсы.
 * @Bean методы в этом контексте НЕ работают.
 */
public class AppConfig implements RequestInterceptor {

    private static final Logger log = LoggerFactory.getLogger(AppConfig.class);

    @Override
    public void apply(RequestTemplate template) {
        // Способ 1: HTTP контекст (обычный случай — входящий запрос через Gateway)
        ServletRequestAttributes attrs =
                (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
        if (attrs != null) {
            var request = attrs.getRequest();
            forwardHeader(template, request, "Authorization");
            forwardHeader(template, request, "X-User-Id");
            forwardHeader(template, request, "X-User-Name");
            forwardHeader(template, request, "X-User-Roles");

            if (request.getHeader("Authorization") != null
                    || request.getHeader("X-User-Id") != null) {
                log.debug("Feign [HTTP ctx]: forwarding headers to {}", template.path());
                return;
            }
        }

        // Способ 2: SecurityContextHolder
        // (Feign вызывается из фонового потока — Kafka listener, @Async, Scheduled)
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getCredentials() instanceof String token && !token.isBlank()) {
            template.header("Authorization", "Bearer " + token);
            log.debug("Feign [SecurityCtx]: forwarding token to {}", template.path());
            return;
        }

        log.warn("Feign: NO auth context for path={}, attrs={}, auth={}",
                template.path(),
                attrs != null ? "present" : "null",
                auth != null ? auth.getClass().getSimpleName() : "null");
    }

    private void forwardHeader(RequestTemplate template, jakarta.servlet.http.HttpServletRequest request, String name) {
        String value = request.getHeader(name);
        if (value != null) {
            template.header(name, value);
        }
    }
}