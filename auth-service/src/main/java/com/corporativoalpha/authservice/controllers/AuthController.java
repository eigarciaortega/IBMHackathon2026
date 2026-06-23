package com.corporativoalpha.authservice.controllers;

import com.corporativoalpha.authservice.models.AuthRequest;
import com.corporativoalpha.authservice.models.AuthResponse;
import com.corporativoalpha.authservice.models.User;
import com.corporativoalpha.authservice.repositories.UserRepository;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Key;
import java.util.Date;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private UserRepository userRepository;

    // Traemos la llave secreta desde el archivo application.properties
    @Value("${jwt.secret}")
    private String secretKey;

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody AuthRequest request) {

        // 1. Buscamos al usuario en la base de datos por su correo
        Optional<User> userOptional = userRepository.findByEmail(request.getEmail());

        // 2. Validamos si existe y si la contraseña coincide
        if (userOptional.isPresent() && userOptional.get().getPassword().equals(request.getPassword())) {
            User user = userOptional.get();

            // 3. Generamos el Token JWT
            Key key = Keys.hmacShaKeyFor(secretKey.getBytes());
            String token = Jwts.builder()
                    .setSubject(user.getEmail())
                    .claim("role", user.getRole())     // Guardamos el rol en el token
                    .claim("userId", user.getId())     // Guardamos el ID en el token
                    .setIssuedAt(new Date())
                    .setExpiration(new Date(System.currentTimeMillis() + 86400000)) // Expira en 24 horas
                    .signWith(key, SignatureAlgorithm.HS256)
                    .compact();

            // 4. Armamos la respuesta exitosa
            AuthResponse response = new AuthResponse();
            response.setToken(token);
            response.setRole(user.getRole());
            response.setUserId(user.getId());

            return ResponseEntity.ok(response);
        }

        // Si el correo no existe o la contraseña está mal:
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Error: Credenciales inválidas");
    }
}