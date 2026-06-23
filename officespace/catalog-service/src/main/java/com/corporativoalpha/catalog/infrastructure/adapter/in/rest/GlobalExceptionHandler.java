package com.corporativoalpha.catalog.infrastructure.adapter.in.rest;

import com.corporativoalpha.catalog.application.dto.ErrorResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex) {
        String msg = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage).collect(Collectors.joining(", "));
        return ResponseEntity.badRequest().body(
            ErrorResponse.builder().status(400).error("Bad Request").message(msg).timestamp(Instant.now()).build());
    }
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegal(IllegalArgumentException ex) {
        return ResponseEntity.badRequest().body(
            ErrorResponse.builder().status(400).error("Bad Request").message(ex.getMessage()).timestamp(Instant.now()).build());
    }
}
