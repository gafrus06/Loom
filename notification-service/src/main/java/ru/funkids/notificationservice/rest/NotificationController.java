package ru.funkids.notificationservice.rest;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import ru.funkids.notificationservice.dto.NotificationCreateRequest;
import ru.funkids.notificationservice.dto.NotificationQueuedResponse;
import ru.funkids.notificationservice.dto.NotificationResponse;
import ru.funkids.notificationservice.dto.UnreadCountResponse;
import ru.funkids.notificationservice.security.GatewayUserPrincipal;
import ru.funkids.notificationservice.security.InternalRequestVerifier;
import ru.funkids.notificationservice.service.NotificationService;

import java.util.List;
import java.util.UUID;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final InternalRequestVerifier internalRequestVerifier;

    @PostMapping("/internal")
    public ResponseEntity<NotificationQueuedResponse> createInternalNotification(
            @Valid @RequestBody NotificationCreateRequest request,
            HttpServletRequest httpServletRequest) {
        internalRequestVerifier.requireVerifiedInternalCaller(httpServletRequest);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(notificationService.enqueue(request));
    }

    @GetMapping("/me")
    public ResponseEntity<List<NotificationResponse>> getMyNotifications(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(notificationService.getMyNotifications(currentUser.getUserId(), page, size));
    }

    @GetMapping("/me/unread-count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount(
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        return ResponseEntity.ok(new UnreadCountResponse(notificationService.getUnreadCount(currentUser.getUserId())));
    }

    @PostMapping("/{notificationId}/read")
    public ResponseEntity<Void> markRead(
            @PathVariable UUID notificationId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        notificationService.markRead(notificationId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/read-all")
    public ResponseEntity<Void> markAllRead(@AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        notificationService.markAllRead(currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/{notificationId}")
    public ResponseEntity<Void> delete(
            @PathVariable UUID notificationId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        notificationService.delete(notificationId, currentUser.getUserId());
        return ResponseEntity.noContent().build();
    }
}
