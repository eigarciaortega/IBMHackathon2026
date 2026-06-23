package org.portfolio.processorservice.dto;

import java.math.BigDecimal;
import java.util.UUID;

public record AccountUserResponse(
        UUID id,
        String name,
        String email,
        BigDecimal balance
) {}
