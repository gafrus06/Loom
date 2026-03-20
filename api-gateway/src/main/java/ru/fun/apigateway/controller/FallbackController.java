package ru.fun.apigateway.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.Map;

/**
 * Fallback-ответ когда Circuit Breaker разомкнут (микросервис недоступен).
 *
 * Circuit Breaker открывается когда:
 *   - 50% запросов за последние 10 завершились ошибкой (5xx / таймаут)
 * После открытия:
 *   - 10 секунд все запросы падают сюда мгновенно (не ждут таймаута)
 *   - Затем 3 тест-запроса: если прошли — цепь закрывается обратно
 *
 * Это защищает Gateway от зависания и снижает нагрузку на упавший сервис.
 */
@RestController
@Slf4j
public class FallbackController {

    @RequestMapping("/fallback")
    public Mono<ResponseEntity<Map<String, String>>> fallback(ServerWebExchange exchange) {
        String path = exchange.getRequest().getPath().toString();
        log.warn("Circuit Breaker triggered for path: {}", path);

        return Mono.just(
                ResponseEntity
                        .status(HttpStatus.SERVICE_UNAVAILABLE)
                        .body(Map.of(
                                "error",   "Service temporarily unavailable",
                                "message", "The service is down or overloaded. Please try again later.",
                                "path",    path
                        ))
        );
    }
}