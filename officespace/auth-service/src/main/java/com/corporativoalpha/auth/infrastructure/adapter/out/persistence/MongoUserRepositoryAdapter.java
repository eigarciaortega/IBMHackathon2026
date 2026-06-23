package com.corporativoalpha.auth.infrastructure.adapter.out.persistence;

import com.corporativoalpha.auth.domain.model.Role;
import com.corporativoalpha.auth.domain.model.User;
import com.corporativoalpha.auth.domain.port.out.UserRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
@RequiredArgsConstructor
public class MongoUserRepositoryAdapter implements UserRepositoryPort {

    private final SpringDataUserRepository repository;

    @Override
    public Optional<User> findByEmail(String email) {
        return repository.findByEmail(email).map(this::toDomain);
    }

    @Override
    public User save(User user) {
        UserDocument doc = toDocument(user);
        return toDomain(repository.save(doc));
    }

    private User toDomain(UserDocument doc) {
        return User.builder()
                .id(doc.getId())
                .email(doc.getEmail())
                .passwordHash(doc.getPasswordHash())
                .fullName(doc.getFullName())
                .role(Role.valueOf(doc.getRole()))
                .active(doc.isActive())
                .build();
    }

    private UserDocument toDocument(User user) {
        UserDocument doc = new UserDocument();
        doc.setId(user.getId());
        doc.setEmail(user.getEmail());
        doc.setPasswordHash(user.getPasswordHash());
        doc.setFullName(user.getFullName());
        doc.setRole(user.getRole().name());
        doc.setActive(user.isActive());
        return doc;
    }
}
