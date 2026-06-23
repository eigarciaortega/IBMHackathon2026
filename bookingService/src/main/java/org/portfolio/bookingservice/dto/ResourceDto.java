package org.portfolio.bookingservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResourceDto {
    private UUID publicId;
    private Integer capacity;
    private Boolean active;
}
