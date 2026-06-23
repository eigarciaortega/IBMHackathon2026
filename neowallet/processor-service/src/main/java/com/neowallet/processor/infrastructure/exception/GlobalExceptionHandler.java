package com.neowallet.processor.infrastructure.exception;

import com.neowallet.processor.domain.exception.AccountsServiceException;
import com.neowallet.processor.domain.exception.TransferValidationException;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.stream.Collectors;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    @ExceptionHandler(TransferValidationException.class)
    public ResponseEntity<ErrorResponse> handleTransferValidation(TransferValidationException ex,
                                                                   HttpServletRequest req) {
        // Diferenciar 404 de 400 según el error code
        HttpStatus status = "user_not_found".equals(ex.getErrorCode())
                ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
        log.warn("Validación de transferencia fallida [{}]: {}", ex.getErrorCode(), ex.getMessage());
        return ResponseEntity.status(status).body(
            ErrorResponse.of(status.value(), ex.getErrorCode(), ex.getMessage(), req.getRequestURI())
        );
    }

    @ExceptionHandler(AccountsServiceException.class)
    public ResponseEntity<ErrorResponse> handleAccountsService(AccountsServiceException ex,
                                                                HttpServletRequest req) {
        log.error("Error en comunicación con accounts-service: {}", ex.getMessage());
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(
            ErrorResponse.of(503, "accounts_service_error", ex.getMessage(), req.getRequestURI())
        );
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException ex,
                                                           HttpServletRequest req) {
        String errors = ex.getBindingResult().getFieldErrors().stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining(", "));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
            ErrorResponse.of(400, "validation_error", errors, req.getRequestURI())
        );
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGeneral(Exception ex, HttpServletRequest req) {
        log.error("Error inesperado: {}", ex.getMessage(), ex);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
            ErrorResponse.of(500, "internal_error", "Error interno del servidor", req.getRequestURI())
        );
    }
}
