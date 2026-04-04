package ru.fun.userservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Публичный профиль пользователя — для отображения родителям.
 *
 * По плану (раздел 18): родитель может открыть профиль вожатого по ссылке.
 * Содержит только публичные данные:
 *   - ФИО, аватар
 *   - специализация, биография, опыт
 *   - количество смен, рейтинг
 *
 * НЕ содержит: email, телефон, документы об образовании, внутренние заметки.
 */
@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class UserPublicProfileResponse {

    private UUID   id;
    private String firstName;
    private String secondName;
    private String thirdName;
    private String avatarUrl;

    // Данные вожатого (если пользователь является вожатым)
    private String     specialization;
    private String     bio;
    private Long       experienceYears;
    private Integer    countOfCompletedShifts;
    private BigDecimal rating;
}