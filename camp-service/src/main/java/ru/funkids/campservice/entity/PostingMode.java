package ru.funkids.campservice.entity;

/**
 * Режим публикации новостей для лагеря.
 * Сами посты хранятся в news-feed-service,
 * а источник истины по правилам публикации живёт в camp-service.
 */
public enum PostingMode {
    FREE,
    MODERATED,
    ONLY_SENIOR_AND_ADMIN,
    ONLY_ADMIN
}
