package ru.funkids.notificationservice.rest;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import ru.funkids.notificationservice.dto.VerifyRequest;
import ru.funkids.notificationservice.dto.VerifyResponse;
import ru.funkids.notificationservice.service.OtpService;


@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications/phone")
public class VerificationController {

    private final OtpService otpService;

    @PostMapping("/verify")
    public ResponseEntity<VerifyResponse> verify(@Valid @RequestBody VerifyRequest req) {
        boolean ok = otpService.verify(req.getPhone(), req.getCode());
        return ResponseEntity.ok(new VerifyResponse(ok));
    }

    @GetMapping("/ttl")
    public long ttl(@RequestParam String phone) { return otpService.ttl(phone); }
}

