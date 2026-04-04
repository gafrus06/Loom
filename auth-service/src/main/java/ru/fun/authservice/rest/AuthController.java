package ru.fun.authservice.rest;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import ru.fun.authservice.dto.*;
import ru.fun.authservice.entity.UserRole;
import ru.fun.authservice.security.GatewayUserPrincipal;
import ru.fun.authservice.security.InternalRequestVerifier;
import ru.fun.authservice.service.AuthService;

import java.util.Arrays;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;
    private final InternalRequestVerifier internalRequestVerifier;

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<String>> register(@RequestBody RegisterRequest request) {
        authService.register(request.getEmail(), request.getPassword());
        return ResponseEntity.ok(new ApiResponse<>("User registered successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<JwtResponse> login(
            @RequestBody LoginRequest request,
            HttpServletResponse response) {
        AuthService.LoginResult result = authService.login(request.getEmail(), request.getPassword());
        setRefreshCookie(response, result.refreshToken());
        return ResponseEntity.ok(new JwtResponse(result.accessToken()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<JwtResponse> refresh(
            HttpServletRequest request,
            HttpServletResponse response) {
        String refreshToken = extractRefreshCookie(request);
        if (refreshToken == null) {
            return ResponseEntity.status(401).build();
        }
        AuthService.LoginResult result = authService.refresh(refreshToken);
        setRefreshCookie(response, result.refreshToken());
        return ResponseEntity.ok(new JwtResponse(result.accessToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response) {
        String refreshToken = extractRefreshCookie(request);
        if (refreshToken != null) {
            authService.logout(refreshToken);
        }
        clearRefreshCookie(response);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/users/{userId}/roles")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN') or #userId.toString() == principal.rawId")
    public ResponseEntity<UserRolesResponse> getUserRoles(@PathVariable UUID userId) {
        List<UserRole> roles = authService.getActiveRoles(userId);
        List<UserRoleDto> roleDtos = roles.stream()
                .map(ur -> new UserRoleDto(
                        ur.getId(),
                        ur.getRole(),
                        ur.getAssignedByUserId(),
                        ur.getAssignedAt()
                ))
                .toList();
        return ResponseEntity.ok(new UserRolesResponse(userId, roleDtos));
    }

    @PostMapping("/users/{targetUserId}/roles")
    @PreAuthorize("hasAnyRole('COUNSELOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<String>> assignRole(
            @PathVariable UUID targetUserId,
            @RequestBody AssignRoleRequest request,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        authService.assignRole(targetUserId, request.role(), currentUser.getUserId());
        return ResponseEntity.ok(new ApiResponse<>(
                "Role " + request.role() + " assigned to userId=" + targetUserId));
    }

    @PostMapping("/internal/assign-role")
    public ResponseEntity<ApiResponse<String>> internalAssignRole(
            @RequestBody InternalAssignRoleRequest request,
            HttpServletRequest httpServletRequest) {
        internalRequestVerifier.requireVerifiedInternalCaller(httpServletRequest);
        authService.assignRoleInternal(request.userId(), request.role());
        return ResponseEntity.ok(new ApiResponse<>(
                "Role " + request.role() + " assigned to userId=" + request.userId()));
    }

    @GetMapping("/internal/users/{userId}/token-version")
    public ResponseEntity<TokenVersionResponse> getTokenVersion(
            @PathVariable UUID userId,
            HttpServletRequest httpServletRequest) {
        internalRequestVerifier.requireVerifiedInternalCaller(httpServletRequest);
        return ResponseEntity.ok(new TokenVersionResponse(userId, authService.getCurrentTokenVersion(userId)));
    }

    @DeleteMapping("/users/{targetUserId}/roles/{role}")
    @PreAuthorize("hasAnyRole('COUNSELOR', 'ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<String>> removeRole(
            @PathVariable UUID targetUserId,
            @PathVariable String role,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        authService.removeRole(targetUserId, role, currentUser.getUserId());
        return ResponseEntity.ok(new ApiResponse<>(
                "Role " + role + " removed from userId=" + targetUserId));
    }

    @PostMapping("/users/{userId}/force-refresh")
    @PreAuthorize("hasRole('SUPER_ADMIN') or #userId.toString() == principal.rawId")
    public ResponseEntity<JwtResponse> forceRefresh(
            @PathVariable UUID userId,
            HttpServletResponse response) {
        AuthService.LoginResult result = authService.forceRefresh(userId);
        setRefreshCookie(response, result.refreshToken());
        return ResponseEntity.ok(new JwtResponse(result.accessToken()));
    }

    @PostMapping("/users/{userId}/logout-all")
    @PreAuthorize("hasRole('SUPER_ADMIN') or #userId.toString() == principal.rawId")
    public ResponseEntity<ApiResponse<String>> logoutAll(@PathVariable UUID userId) {
        authService.logoutAll(userId);
        return ResponseEntity.ok(new ApiResponse<>("All sessions revoked for userId=" + userId));
    }

    @PostMapping("/users/{targetUserId}/deactivate")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<String>> deactivateUser(
            @PathVariable UUID targetUserId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        authService.deactivateUser(targetUserId, currentUser.getUserId());
        return ResponseEntity.ok(new ApiResponse<>("User " + targetUserId + " deactivated"));
    }

    @PostMapping("/users/{targetUserId}/activate")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<ApiResponse<String>> activateUser(
            @PathVariable UUID targetUserId,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser) {
        authService.activateUser(targetUserId, currentUser.getUserId());
        return ResponseEntity.ok(new ApiResponse<>("User " + targetUserId + " activated"));
    }

    private void setRefreshCookie(HttpServletResponse response, String refreshToken) {
        int maxAge = 30 * 24 * 60 * 60;
        response.addHeader("Set-Cookie", String.format(
                "refresh_token=%s; Path=/api/auth; HttpOnly; %sSameSite=Strict; Max-Age=%d",
                refreshToken,
                cookieSecure ? "Secure; " : "",
                maxAge
        ));
    }

    private void clearRefreshCookie(HttpServletResponse response) {
        response.addHeader("Set-Cookie", String.format(
                "refresh_token=; Path=/api/auth; HttpOnly; %sSameSite=Strict; Max-Age=0",
                cookieSecure ? "Secure; " : ""
        ));
    }

    private String extractRefreshCookie(HttpServletRequest request) {
        if (request.getCookies() == null) return null;
        return Arrays.stream(request.getCookies())
                .filter(c -> "refresh_token".equals(c.getName()))
                .map(Cookie::getValue)
                .findFirst()
                .orElse(null);
    }
}
