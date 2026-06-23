package org.portfolio.catalogservice.enums;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Getter
@RequiredArgsConstructor
public enum ResourceType {
    ROOM("Room"),
    DESK("Desk");

    private final String label;
}
