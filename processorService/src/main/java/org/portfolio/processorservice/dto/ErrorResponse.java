package org.portfolio.processorservice.dto;

public record ErrorResponse(String error, String message, int status) {}
