package ru.funkids.campservice.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Feign конфигурация специально для AuthServiceInternalClient.
 * Добавляет X-Internal-Secret для аутентификации внутреннего эндпоинта
 * /api/auth/internal/assign-role в auth-service.
 *
 * ВАЖНО: НЕТ @Configuration и НЕТ @Bean.
 * Feign инстанциирует этот класс сам — @Value НЕ работает.
 * Секрет читается напрямую из System.getenv или захардкожен.
 */
public class AuthServiceFeignConfig implements RequestInterceptor {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceFeignConfig.class);

    private static final String INTERNAL_SECRET_HEADER = "X-Internal-Secret";

    // Feign создаёт этот класс сам, поэтому @Value не работает.
    // Берём секрет из env-переменной, с fallback на дефолт из application.yml.
    private static final String SECRET =
            System.getenv("INTERNAL_SERVICE_SECRET") != null
                    ? System.getenv("INTERNAL_SERVICE_SECRET")
                    : "camp-service-secret-2024";

    @Override
    public void apply(RequestTemplate template) {
        template.header(INTERNAL_SECRET_HEADER, SECRET);
        log.debug("AuthServiceFeignConfig: added X-Internal-Secret to {}", template.path());
    }
}