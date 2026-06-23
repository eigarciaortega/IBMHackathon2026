package org.portfolio.bookingservice.dto.analytics;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.UUID;

@Data
@AllArgsConstructor
public class SpaceUsageDto {
    private UUID spacePublicId;
    private long bookingCount;
}
