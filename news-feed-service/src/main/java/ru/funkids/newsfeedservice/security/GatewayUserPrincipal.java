package ru.funkids.newsfeedservice.security;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

public class GatewayUserPrincipal implements UserDetails {

    private final UUID   userId;
    private final String username;
    private final Set<String> roles;

    public GatewayUserPrincipal(String userId, String username, Set<String> roles) {
        this.userId   = UUID.fromString(userId);
        this.username = username;
        this.roles    = roles;
    }

    public UUID getUserId()       { return userId; }
    public Set<String> getRoles() { return roles; }

    @Override
    public String getUsername() { return username; }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
                .map(r -> new SimpleGrantedAuthority(r.startsWith("ROLE_") ? r : "ROLE_" + r))
                .collect(Collectors.toSet());
    }

    @Override public String  getPassword()              { return null; }
    @Override public boolean isAccountNonExpired()      { return true; }
    @Override public boolean isAccountNonLocked()       { return true; }
    @Override public boolean isCredentialsNonExpired()  { return true; }
    @Override public boolean isEnabled()                { return true; }
}