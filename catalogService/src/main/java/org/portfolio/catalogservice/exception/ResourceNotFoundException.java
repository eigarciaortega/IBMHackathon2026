package org.portfolio.catalogservice.exception;

import java.util.UUID;

public class ResourceNotFoundException extends RuntimeException {

    public ResourceNotFoundException(UUID publicId) {
        super("Resource not found with publicId: " + publicId);
    }
}
