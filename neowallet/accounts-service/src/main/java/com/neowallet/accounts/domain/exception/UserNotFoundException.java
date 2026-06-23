package com.neowallet.accounts.domain.exception;

public class UserNotFoundException extends RuntimeException {
    private final Long userId;

    public UserNotFoundException(Long userId) {
        super("Usuario no encontrado con ID: " + userId);
        this.userId = userId;
    }

    public UserNotFoundException(String message) {
        super(message);
        this.userId = null;
    }

    public Long getUserId() { return userId; }
}
