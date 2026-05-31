package ru.funkids.campservice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "internal-auth")
public class InternalAuthProperties {

    /**
     * Общий секрет для подписи внутренних запросов между сервисами.
     */
    private String secret;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }
}