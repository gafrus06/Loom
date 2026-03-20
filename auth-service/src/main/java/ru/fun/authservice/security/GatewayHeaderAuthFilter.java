package ru.fun.authservice.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

/**
 * Читает заголовки X-User-* которые проставил Gateway после валидации JWT.
 * Строит Authentication без повторного парсинга токена.
 */
@Component
@Slf4j
public class GatewayHeaderAuthFilter extends OncePerRequestFilter {

    private static final String HEADER_USER_ID    = "X-User-Id";
    private static final String HEADER_USER_NAME  = "X-User-Name";
    private static final String HEADER_USER_ROLES = "X-User-Roles";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain filterChain)
            throws ServletException, IOException {

        String userId   = request.getHeader(HEADER_USER_ID);
        String userName = request.getHeader(HEADER_USER_NAME);
        String rolesRaw = request.getHeader(HEADER_USER_ROLES);

        log.debug("GatewayHeaderAuthFilter: path={} userId={} userName={} rolesRaw={}",
                request.getRequestURI(), userId, userName, rolesRaw);

        if (userId != null && userName != null && rolesRaw != null
                && SecurityContextHolder.getContext().getAuthentication() == null) {

            Set<String> roles = new HashSet<>(Arrays.asList(rolesRaw.split(",")));
            GatewayUserPrincipal principal = new GatewayUserPrincipal(userId, userName, roles);

            log.debug("GatewayHeaderAuthFilter: building auth for user={} authorities={}",
                    userName, principal.getAuthorities());

            UsernamePasswordAuthenticationToken auth =
                    new UsernamePasswordAuthenticationToken(
                            principal, null, principal.getAuthorities()
                    );

            SecurityContextHolder.getContext().setAuthentication(auth);
        } else {
            log.warn("GatewayHeaderAuthFilter: missing headers or auth already set — " +
                            "userId={} userName={} rolesRaw={} existingAuth={}",
                    userId, userName, rolesRaw,
                    SecurityContextHolder.getContext().getAuthentication());
        }

        filterChain.doFilter(request, response);
    }
}