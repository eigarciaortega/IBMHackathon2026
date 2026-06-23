package org.portfolio.catalogservice.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.portfolio.catalogservice.dto.ResourceRequest;
import org.portfolio.catalogservice.dto.ResourceResponse;
import org.portfolio.catalogservice.entity.Resource;
import org.portfolio.catalogservice.enums.ResourceType;
import org.portfolio.catalogservice.exception.ResourceNotFoundException;
import org.portfolio.catalogservice.repository.ResourceRepository;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResourceServiceTest {

    @Mock
    private ResourceRepository resourceRepository;

    @InjectMocks
    private ResourceService resourceService;

    private Resource salaCreativa;
    private Resource escritorio;

    @BeforeEach
    void setUp() {
        salaCreativa = Resource.builder()
                .publicId(UUID.randomUUID())
                .name("Sala Creativa")
                .type(ResourceType.ROOM)
                .capacity(8)
                .location("Floor 1")
                .active(true)
                .features(Map.of("has_projector", true))
                .build();

        escritorio = Resource.builder()
                .publicId(UUID.randomUUID())
                .name("Escritorio Silencioso")
                .type(ResourceType.DESK)
                .capacity(1)
                .location("Floor 3")
                .active(true)
                .features(Map.of("has_ac", false))
                .build();
    }

    // --- findAll ---

    @Test
    void findAll_noFilters_returnsAllActive() {
        when(resourceRepository.findByActiveTrue()).thenReturn(List.of(salaCreativa, escritorio));

        List<ResourceResponse> result = resourceService.findAll(null, null);

        assertThat(result).hasSize(2);
        verify(resourceRepository).findByActiveTrue();
    }

    @Test
    void findAll_withTypeFilter_returnsOnlyMatchingType() {
        when(resourceRepository.findByActiveTrueAndType(ResourceType.ROOM))
                .thenReturn(List.of(salaCreativa));

        List<ResourceResponse> result = resourceService.findAll(ResourceType.ROOM, null);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getType()).isEqualTo(ResourceType.ROOM);
        verify(resourceRepository).findByActiveTrueAndType(ResourceType.ROOM);
    }

    @Test
    void findAll_withCapacityFilter_returnsOnlyResourcesAboveMinCapacity() {
        when(resourceRepository.findByActiveTrueAndCapacityGreaterThanEqual(5))
                .thenReturn(List.of(salaCreativa));

        List<ResourceResponse> result = resourceService.findAll(null, 5);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCapacity()).isGreaterThanOrEqualTo(5);
        verify(resourceRepository).findByActiveTrueAndCapacityGreaterThanEqual(5);
    }

    @Test
    void findAll_withBothFilters_delegatesCorrectQuery() {
        when(resourceRepository.findByActiveTrueAndTypeAndCapacityGreaterThanEqual(ResourceType.ROOM, 5))
                .thenReturn(List.of(salaCreativa));

        List<ResourceResponse> result = resourceService.findAll(ResourceType.ROOM, 5);

        assertThat(result).hasSize(1);
        verify(resourceRepository).findByActiveTrueAndTypeAndCapacityGreaterThanEqual(ResourceType.ROOM, 5);
    }

    // --- findByPublicId ---

    @Test
    void findByPublicId_existingResource_returnsResponse() {
        UUID id = salaCreativa.getPublicId();
        when(resourceRepository.findByPublicId(id)).thenReturn(Optional.of(salaCreativa));

        ResourceResponse result = resourceService.findByPublicId(id);

        assertThat(result.getPublicId()).isEqualTo(id);
        assertThat(result.getName()).isEqualTo("Sala Creativa");
    }

    @Test
    void findByPublicId_unknownId_throwsResourceNotFoundException() {
        UUID unknownId = UUID.randomUUID();
        when(resourceRepository.findByPublicId(unknownId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> resourceService.findByPublicId(unknownId))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessageContaining(unknownId.toString());
    }

    // --- create ---

    @Test
    void create_validRequest_persistsAndReturnsResponse() {
        ResourceRequest request = new ResourceRequest();
        request.setName("Nueva Sala");
        request.setType(ResourceType.ROOM);
        request.setCapacity(10);
        request.setLocation("Floor 5");
        request.setFeatures(Map.of("has_projector", true));

        when(resourceRepository.save(any(Resource.class))).thenAnswer(inv -> {
            Resource r = inv.getArgument(0);
            r.setPublicId(UUID.randomUUID());
            return r;
        });

        ResourceResponse result = resourceService.create(request);

        assertThat(result.getName()).isEqualTo("Nueva Sala");
        assertThat(result.getCapacity()).isEqualTo(10);
        verify(resourceRepository).save(any(Resource.class));
    }

    // --- softDelete ---

    @Test
    void softDelete_existingResource_setsActiveToFalse() {
        UUID id = salaCreativa.getPublicId();
        when(resourceRepository.findByPublicId(id)).thenReturn(Optional.of(salaCreativa));
        when(resourceRepository.save(any())).thenReturn(salaCreativa);

        resourceService.softDelete(id);

        assertThat(salaCreativa.getActive()).isFalse();
        verify(resourceRepository).save(salaCreativa);
    }

    @Test
    void softDelete_unknownId_throwsResourceNotFoundException() {
        UUID unknownId = UUID.randomUUID();
        when(resourceRepository.findByPublicId(unknownId)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> resourceService.softDelete(unknownId))
                .isInstanceOf(ResourceNotFoundException.class);
    }
}
