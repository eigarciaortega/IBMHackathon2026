package com.neowallet.accounts.domain.port.out;

import com.neowallet.accounts.domain.model.User;
import java.util.Optional;

public interface UserRepositoryPort {
    Optional<User> findById(Long id);
    Optional<User> findByEmail(String email);
    User save(User user);
    /** Obtiene el usuario con bloqueo pesimista para operaciones de actualización de saldo. */
    User findByIdWithLock(Long id);
}
