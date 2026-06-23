package org.portfolio.authservice.domain.enums;

import lombok.Getter;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Getter
public enum Role {
    ADMIN(Set.of(
            Permission.MANAGE_RESOURCES,
            Permission.VIEW_DASHBOARD,
            Permission.VIEW_RESOURCES,
            Permission.CREATE_BOOKING,
            Permission.VIEW_OWN_BOOKINGS,
            Permission.CANCEL_OWN_BOOKINGS
    )),

    COLLABORATOR(Set.of(
            Permission.CREATE_BOOKING,
            Permission.VIEW_OWN_BOOKINGS,
            Permission.CANCEL_OWN_BOOKINGS,
            Permission.VIEW_RESOURCES
    ));

    private final Set<Permission> permissions;
    Role(Set<Permission> permissions) {
        this.permissions = permissions;
    }

    public List<SimpleGrantedAuthority> getAuthorities() {
        List<SimpleGrantedAuthority> authorities = getPermissions()
                .stream()
                .map(permission -> new SimpleGrantedAuthority(permission.getValue()))
                .collect(Collectors.toList());

        authorities.add(new SimpleGrantedAuthority("ROLE_" + this.name()));
        return authorities;
    }
}
