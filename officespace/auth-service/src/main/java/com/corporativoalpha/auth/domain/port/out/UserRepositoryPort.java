package com.corporativoalpha.auth.domain.port.out;

import com.corporativoalpha.auth.domain.model.User;
import java.util.Optional;

public interface UserRepositoryPort {
    Optional<User> findByEmail(String email);
    User save(User user);
}
