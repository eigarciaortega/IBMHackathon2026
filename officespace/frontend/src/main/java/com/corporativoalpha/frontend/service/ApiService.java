package com.corporativoalpha.frontend.service;

import com.corporativoalpha.frontend.dto.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class ApiService {

    private final RestTemplate restTemplate;

    @Value("${services.auth.url}")
    private String authUrl;

    @Value("${services.catalog.url}")
    private String catalogUrl;

    @Value("${services.booking.url}")
    private String bookingUrl;

    public Optional<UserSession> login(String email, String password) {
        try {
            Map<String, String> body = Map.of("email", email, "password", password);
            ResponseEntity<Map<String, Object>> response = restTemplate.exchange(
                authUrl + "/api/auth/login",
                HttpMethod.POST,
                new HttpEntity<>(body, jsonHeaders(null)),
                new ParameterizedTypeReference<>() {}
            );
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                Map<String, Object> data = response.getBody();
                UserSession session = new UserSession();
                session.setToken((String) data.get("token"));
                session.setEmail((String) data.get("email"));
                session.setFullName((String) data.get("fullName"));
                session.setRole((String) data.get("role"));
                session.setAuthenticated(true);
                return Optional.of(session);
            }
        } catch (HttpClientErrorException e) {
            log.warn("Login failed: {}", e.getStatusCode());
        } catch (Exception e) {
            log.error("Auth service error: {}", e.getMessage());
        }
        return Optional.empty();
    }

    public List<SpaceDto> getSpaces(String token, String type, Integer minCapacity) {
        try {
            String url = catalogUrl + "/api/spaces";
            List<String> params = new ArrayList<>();
            if (type != null && !type.isBlank()) params.add("type=" + type);
            if (minCapacity != null) params.add("minCapacity=" + minCapacity);
            if (!params.isEmpty()) url += "?" + String.join("&", params);

            ResponseEntity<SpaceDto[]> response = restTemplate.exchange(
                url, HttpMethod.GET, new HttpEntity<>(jsonHeaders(token)), SpaceDto[].class
            );
            return response.getBody() != null ? Arrays.asList(response.getBody()) : List.of();
        } catch (Exception e) {
            log.error("Error getting spaces: {}", e.getMessage());
            return List.of();
        }
    }

    public Optional<SpaceDto> getSpaceById(String id, String token) {
        try {
            ResponseEntity<SpaceDto> response = restTemplate.exchange(
                catalogUrl + "/api/spaces/" + id, HttpMethod.GET,
                new HttpEntity<>(jsonHeaders(token)), SpaceDto.class
            );
            return Optional.ofNullable(response.getBody());
        } catch (Exception e) {
            return Optional.empty();
        }
    }

    public Optional<SpaceDto> createSpace(SpaceDto dto, String token) {
        try {
            ResponseEntity<SpaceDto> response = restTemplate.exchange(
                catalogUrl + "/api/spaces", HttpMethod.POST,
                new HttpEntity<>(dto, jsonHeaders(token)), SpaceDto.class
            );
            return Optional.ofNullable(response.getBody());
        } catch (Exception e) {
            log.error("Error creating space: {}", e.getMessage());
            return Optional.empty();
        }
    }

    public boolean updateSpace(String id, SpaceDto dto, String token) {
        try {
            restTemplate.exchange(
                catalogUrl + "/api/spaces/" + id, HttpMethod.PUT,
                new HttpEntity<>(dto, jsonHeaders(token)), SpaceDto.class
            );
            return true;
        } catch (Exception e) {
            log.error("Error updating space: {}", e.getMessage());
            return false;
        }
    }

    public boolean deleteSpace(String id, String token) {
        try {
            restTemplate.exchange(
                catalogUrl + "/api/spaces/" + id, HttpMethod.DELETE,
                new HttpEntity<>(jsonHeaders(token)), Void.class
            );
            return true;
        } catch (Exception e) {
            log.error("Error deleting space: {}", e.getMessage());
            return false;
        }
    }

    public Optional<BookingDto> createBooking(CreateBookingDto dto, String token) {
        try {
            ResponseEntity<BookingDto> response = restTemplate.exchange(
                bookingUrl + "/api/bookings", HttpMethod.POST,
                new HttpEntity<>(dto, jsonHeaders(token)), BookingDto.class
            );
            return Optional.ofNullable(response.getBody());
        } catch (HttpClientErrorException e) {
            log.warn("Booking error {}: {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException(extractMessage(e.getResponseBodyAsString()), e);
        }
    }

    public List<BookingDto> getMyBookings(String token) {
        try {
            ResponseEntity<BookingDto[]> response = restTemplate.exchange(
                bookingUrl + "/api/bookings/my", HttpMethod.GET,
                new HttpEntity<>(jsonHeaders(token)), BookingDto[].class
            );
            return response.getBody() != null ? Arrays.asList(response.getBody()) : List.of();
        } catch (Exception e) {
            log.error("Error getting bookings: {}", e.getMessage());
            return List.of();
        }
    }

    public List<BookingDto> getTodayBookings(String token) {
        try {
            ResponseEntity<BookingDto[]> response = restTemplate.exchange(
                bookingUrl + "/api/bookings/today", HttpMethod.GET,
                new HttpEntity<>(jsonHeaders(token)), BookingDto[].class
            );
            return response.getBody() != null ? Arrays.asList(response.getBody()) : List.of();
        } catch (Exception e) {
            return List.of();
        }
    }

    public boolean cancelBooking(String id, String token) {
        try {
            restTemplate.exchange(
                bookingUrl + "/api/bookings/" + id, HttpMethod.DELETE,
                new HttpEntity<>(jsonHeaders(token)), Void.class
            );
            return true;
        } catch (Exception e) {
            log.error("Error cancelling booking: {}", e.getMessage());
            return false;
        }
    }

    private HttpHeaders jsonHeaders(String token) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        if (token != null && !token.isBlank()) {
            headers.setBearerAuth(token);
        }
        return headers;
    }

    private String extractMessage(String json) {
        if (json != null && json.contains(""message"")) {
            try {
                int start = json.indexOf(""message"") + 11;
                int end = json.indexOf(""", start);
                return json.substring(start, end);
            } catch (Exception ignored) {}
        }
        return "Error en la operación";
    }
}
