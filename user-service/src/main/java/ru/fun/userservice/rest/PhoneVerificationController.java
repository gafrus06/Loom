package ru.fun.userservice.rest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.fun.userservice.dto.notification.PhoneVerificationConfirmRequest;
import ru.fun.userservice.dto.notification.VerifyResponse;
import ru.fun.userservice.dto.notification.PhoneVerificationStartRequest;
import ru.fun.userservice.security.GatewayUserPrincipal;
import ru.fun.userservice.service.PhoneVerificationService;

/**
 * Эндпоинты верификации телефона.
 * Вся бизнес-логика делегирована в PhoneVerificationService.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/users/profile/phone/verification")
public class PhoneVerificationController {

    private final PhoneVerificationService phoneVerificationService;

    @PostMapping("/start")
    public ResponseEntity<Void> start(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser,
            @Valid @RequestBody PhoneVerificationStartRequest req
    ) {
        phoneVerificationService.startVerification(currentUser.getUserId(), req.getPhone());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/confirm")
    public ResponseEntity<VerifyResponse> confirm(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser,
            @Valid @RequestBody PhoneVerificationConfirmRequest req
    ) {
        return ResponseEntity.ok(
                phoneVerificationService.confirmVerification(currentUser.getUserId(), req)
        );
    }
}