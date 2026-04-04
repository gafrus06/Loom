package ru.funkids.campservice.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class AuthServiceFeignConfig implements RequestInterceptor {

    private static final Logger log = LoggerFactory.getLogger(AuthServiceFeignConfig.class);
    private static final String CALLER_SERVICE = "camp-service";

    @Override
    public void apply(RequestTemplate template) {
        InternalRequestSigner.signInternal(template, CALLER_SERVICE);
        log.debug("AuthServiceFeignConfig: added signed internal proof to {}", template.path());
    }
}
