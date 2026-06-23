package org.portfolio.accountservice.dto;

public record ErrorResponse(String error, String message, int status) {}
