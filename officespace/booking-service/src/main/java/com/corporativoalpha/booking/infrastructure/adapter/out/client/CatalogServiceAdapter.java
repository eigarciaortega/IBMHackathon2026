package com.corporativoalpha.booking.infrastructure.adapter.out.client;

import com.corporativoalpha.booking.application.dto.SpaceInfo;
import com.corporativoalpha.booking.domain.port.out.SpaceClientPort;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class CatalogServiceAdapter implements SpaceClientPort {

    private final WebClient webClient;

    @Value("${services.catalog.url}")
    private String catalogUrl;

    @Value("${app.service.token}")
    private String serviceToken;

    @Override
    public Optional<SpaceInfo> getSpaceById(String spaceId, String token) {
        try {
            String authToken = (token != null) ? token : "Bearer " + serviceToken;
            SpaceInfo space = webClient.get()
                    .uri(catalogUrl + "/api/spaces/" + spaceId)
                    .header("Authorization", authToken.startsWith("Bearer ") ? authToken : "Bearer " + authToken)
                    .retrieve()
                    .bodyToMono(SpaceInfo.class)
                    .block();
            return Optional.ofNullable(space);
        } catch (WebClientResponseException.NotFound e) {
            return Optional.empty();
        } catch (Exception e) {
            log.error("Error calling catalog-service: {}", e.getMessage());
            return Optional.empty();
        }
    }

    @Override
    public List<SpaceInfo> getActiveSpaces(String token) {
        try {
            String authToken = (token != null) ? token : "Bearer " + serviceToken;
            SpaceInfo[] spaces = webClient.get()
                    .uri(catalogUrl + "/api/spaces/active")
                    .header("Authorization", authToken.startsWith("Bearer ") ? authToken : "Bearer " + authToken)
                    .retrieve()
                    .bodyToMono(SpaceInfo[].class)
                    .block();
            return spaces != null ? Arrays.asList(spaces) : List.of();
        } catch (Exception e) {
            log.error("Error fetching active spaces: {}", e.getMessage());
            return List.of();
        }
    }
}
