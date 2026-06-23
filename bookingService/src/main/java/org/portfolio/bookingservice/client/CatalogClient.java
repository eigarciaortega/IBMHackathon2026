package org.portfolio.bookingservice.client;

import org.portfolio.bookingservice.dto.ResourceDto;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.util.Optional;
import java.util.UUID;

@Component
public class CatalogClient {

    private final RestClient restClient;

    public CatalogClient(@Value("${catalog.service.url}") String catalogUrl) {
        this.restClient = RestClient.builder()
                .baseUrl(catalogUrl)
                .build();
    }

    public Optional<ResourceDto> findByPublicId(UUID publicId) {
        try {
            ResourceDto resource = restClient.get()
                    .uri("/api/resources/{id}", publicId)
                    .retrieve()
                    .body(ResourceDto.class);
            return Optional.ofNullable(resource);
        } catch (RestClientException e) {
            return Optional.empty();
        }
    }
}
