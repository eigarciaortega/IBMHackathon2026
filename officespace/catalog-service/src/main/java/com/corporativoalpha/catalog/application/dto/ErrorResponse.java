package com.corporativoalpha.catalog.application.dto;

import lombok.Builder;
import lombok.Data;
import java.time.Instant;

@Data @Builder
public class ErrorResponse {
    private int status;
    private String error;
    private String message;
    private Instant timestamp;
}
