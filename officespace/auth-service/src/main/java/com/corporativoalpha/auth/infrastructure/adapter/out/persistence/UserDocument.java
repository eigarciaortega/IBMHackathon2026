package com.corporativoalpha.auth.infrastructure.adapter.out.persistence;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "users")
public class UserDocument {
    @Id private String id;
    @Indexed(unique = true) private String email;
    private String passwordHash;
    private String fullName;
    private String role;
    private boolean active;
}
