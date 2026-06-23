package org.portfolio.accountservice.exception;

import java.util.UUID;

public class UserNotFoundException extends RuntimeException {
    public UserNotFoundException(UUID publicId) {
        super("User not found with id: " + publicId);
    }
}
