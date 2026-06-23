package org.portfolio.authservice.domain.enums;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public enum Permission {
    MANAGE_RESOURCES("manage_resources"),
    VIEW_DASHBOARD("view_dashboard"),
    CREATE_BOOKING("create_booking"),
    VIEW_OWN_BOOKINGS("view_own_bookings"),
    CANCEL_OWN_BOOKINGS("cancel_own_bookings"),
    VIEW_RESOURCES("view_resources");

    private final String value;
}
