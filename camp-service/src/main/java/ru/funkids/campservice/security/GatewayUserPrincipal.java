package ru.funkids.campservice.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public class GatewayUserPrincipal implements UserDetails {

    private final UUID userId;
    private final String username;
    private final Set<String> roles;
    public final String rawId;

    public GatewayUserPrincipal(String userId, String username, Set<String> roles) {
        this.userId   = UUID.fromString(userId);
        this.rawId    = userId;
        this.username = username;
        this.roles    = roles;
    }

    public UUID getUserId() { return userId; }
    public boolean hasRole(String roleName) {
        String normalized = roleName.startsWith("ROLE_") ? roleName : "ROLE_" + roleName;
        return roles.stream().anyMatch(role -> normalized.equals(role.startsWith("ROLE_") ? role : "ROLE_" + role));
    }

    @Override
    public String getUsername() { return username; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
                .map(role -> new SimpleGrantedAuthority(
                        role.startsWith("ROLE_") ? role : "ROLE_" + role
                ))
                .collect(Collectors.toSet());
    }

    @Override public String getPassword()             { return null; }
    @Override public boolean isAccountNonExpired()    { return true; }
    @Override public boolean isAccountNonLocked()     { return true; }
    @Override public boolean isCredentialsNonExpired(){ return true; }
    @Override public boolean isEnabled()              { return true; }
}
