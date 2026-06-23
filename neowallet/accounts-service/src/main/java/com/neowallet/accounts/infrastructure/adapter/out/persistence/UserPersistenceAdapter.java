package com.neowallet.accounts.infrastructure.adapter.out.persistence;

import com.neowallet.accounts.domain.exception.UserNotFoundException;
import com.neowallet.accounts.domain.model.User;
import com.neowallet.accounts.domain.port.out.UserRepositoryPort;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class UserPersistenceAdapter implements UserRepositoryPort {

    private final UserJpaRepository jpaRepository;

    public UserPersistenceAdapter(UserJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public Optional<User> findById(Long id) {
        return jpaRepository.findById(id).map(UserJpaEntity::toDomain);
    }

    @Override
    public Optional<User> findByEmail(String email) {
        return jpaRepository.findByEmail(email).map(UserJpaEntity::toDomain);
    }

    @Override
    public User save(User user) {
        return jpaRepository.save(UserJpaEntity.fromDomain(user)).toDomain();
    }

    @Override
    public User findByIdWithLock(Long id) {
        return jpaRepository.findByIdWithLock(id)
                .map(UserJpaEntity::toDomain)
                .orElseThrow(() -> new UserNotFoundException(id));
    }
}
