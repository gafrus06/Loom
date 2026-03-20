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
import ru.fun.authservice.entity.Role;
import ru.fun.authservice.entity.User;
import ru.fun.authservice.security.GatewayUserPrincipal;
import ru.fun.authservice.service.AuthService;

import java.util.Arrays;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {

    private final AuthService authService;

    @Value("${app.cookie.secure:true}")
    private boolean cookieSecure;

    // ── Публичные эндпоинты ──────────────────────────────────────────

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<String>> register(@RequestBody RegisterRequest request) {
        authService.register(request.getEmail(), request.getPassword());
        return ResponseEntity.ok(new ApiResponse<>("User registered successfully"));
    }

    @PostMapping("/login")
    public ResponseEntity<JwtResponse> login(
            @RequestBody LoginRequest request,
            HttpServletResponse response
    ) {
        AuthService.LoginResult result = authService.login(request.getEmail(), request.getPassword());
        setRefreshCookie(response, result.refreshToken());
        // В теле возвращаем ТОЛЬКО access token — refresh фронт не видит
        return ResponseEntity.ok(new JwtResponse(result.accessToken()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<JwtResponse> refresh(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String refreshToken = extractRefreshCookie(request);
        if (refreshToken == null) {
            return ResponseEntity.status(401).build();
        }
        AuthService.LoginResult result = authService.refresh(refreshToken);
        // Rotation — каждый раз новый refresh токен
        setRefreshCookie(response, result.refreshToken());
        return ResponseEntity.ok(new JwtResponse(result.accessToken()));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            HttpServletRequest request,
            HttpServletResponse response
    ) {
        String refreshToken = extractRefreshCookie(request);
        if (refreshToken != null) {
            authService.logout(refreshToken);
        }
        clearRefreshCookie(response);
        return ResponseEntity.ok().build();
    }

    // ── Защищённые эндпоинты ─────────────────────────────────────────

    @GetMapping("/users/{id}/roles")
    public ResponseEntity<UserRoleResponse> getUserRoles(@PathVariable UUID id) {
        User user = authService.getUserById(id);
        Set<String> roles = user.getRoles().stream()
                .map(Role::getName)
                .collect(Collectors.toSet());
        return ResponseEntity.ok(new UserRoleResponse(user.getEmail(), roles));
    }

    @PostMapping("/assign-role")
    @PreAuthorize("hasRole('ADMIN') or hasRole('COUNSELOR')")
    public ResponseEntity<ApiResponse<String>> assignRole(
            @RequestBody AssignRoleRequest request,
            @AuthenticationPrincipal GatewayUserPrincipal currentUser
    ) {
        User user = authService.findUserByEmail(currentUser.getUsername());
        authService.assignRole(request.getEmail(), request.getRole(), user);
        return ResponseEntity.ok(new ApiResponse<>(
                "Role " + request.getRole() + " assigned to " + request.getEmail()
        ));
    }

    @PreAuthorize("hasRole('ADMIN') or #userId.toString() == principal.rawId")
    @PostMapping("/force-refresh/{userId}")
    public ResponseEntity<JwtResponse> forceRefresh(
            @PathVariable UUID userId,
            HttpServletResponse response
    ) {
        AuthService.LoginResult result = authService.generateTokens(authService.getUserById(userId));
        setRefreshCookie(response, result.refreshToken());
        return ResponseEntity.ok(new JwtResponse(result.accessToken()));
    }

    @DeleteMapping("/users/{userId}/roles/{role}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<String>> removeRole(
            @PathVariable UUID userId,
            @PathVariable String role
    ) {
        authService.removeRoleById(userId, role);
        return ResponseEntity.ok(new ApiResponse<>("Role " + role + " removed from " + userId));
    }

    @PostMapping("/internal/assign-role")
    public ResponseEntity<ApiResponse<String>> internalAssignRole(
            @RequestBody InternalAssignRoleRequest request,
            @RequestHeader(value = "X-Internal-Secret", required = false) String secret
    ) {
        String expectedSecret = System.getenv("INTERNAL_SERVICE_SECRET");
        if (expectedSecret == null) expectedSecret = "camp-service-secret-2024";
        if (!expectedSecret.equals(secret)) {
            return ResponseEntity.status(403).body(new ApiResponse<>("Forbidden"));
        }
        authService.assignRoleById(request.userId(), request.role());
        return ResponseEntity.ok(new ApiResponse<>(
                "Role " + request.role() + " assigned to " + request.userId()
        ));
    }

    // ── Cookie helpers ───────────────────────────────────────────────

    private void setRefreshCookie(HttpServletResponse response, String refreshToken) {
        int maxAge = 30 * 24 * 60 * 60; // 30 дней
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