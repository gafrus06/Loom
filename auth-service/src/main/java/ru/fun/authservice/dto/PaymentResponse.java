package ru.fun.authservice.dto;

public record PaymentResponse(
        String paymentId,
        String confirmationUrl,
        String type
) {}
