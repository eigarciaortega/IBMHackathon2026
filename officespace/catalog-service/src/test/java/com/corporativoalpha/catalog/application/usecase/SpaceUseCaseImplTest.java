package com.corporativoalpha.catalog.application.usecase;

import com.corporativoalpha.catalog.application.dto.CreateSpaceRequest;
import com.corporativoalpha.catalog.application.dto.SpaceResponse;
import com.corporativoalpha.catalog.domain.exception.SpaceNotFoundException;
import com.corporativoalpha.catalog.domain.model.Space;
import com.corporativoalpha.catalog.domain.model.SpaceType;
import com.corporativoalpha.catalog.domain.port.out.SpaceRepositoryPort;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("SpaceUseCaseImpl – Unit Tests")
class SpaceUseCaseImplTest {

    @Mock private SpaceRepositoryPort spaceRepository;
    @InjectMocks private SpaceUseCaseImpl spaceUseCase;

    private Space sampleSpace;

    @BeforeEach
    void setUp() {
        sampleSpace = Space.builder()
                .id("space-1")
                .name("Sala Ejecutiva A")
                .type(SpaceType.SALA_JUNTAS)
                .capacity(12)
                .floor("Piso 5")
                .location("Torre Norte")
                .resources(List.of("Proyector", "AC"))
                .active(true)
                .build();
    }

    @Test
    @DisplayName("Crear espacio – retorna SpaceResponse con ID")
    void createSpace_validRequest_returnsResponse() {
        CreateSpaceRequest req = new CreateSpaceRequest();
        req.setName("Sala Ejecutiva A");
        req.setType("SALA_JUNTAS");
        req.setCapacity(12);
        req.setFloor("Piso 5");
        req.setLocation("Torre Norte");
        req.setResources(List.of("Proyector", "AC"));

        when(spaceRepository.save(any())).thenReturn(sampleSpace);

        SpaceResponse response = spaceUseCase.createSpace(req);

        assertThat(response.getId()).isEqualTo("space-1");
        assertThat(response.getName()).isEqualTo("Sala Ejecutiva A");
        assertThat(response.getCapacity()).isEqualTo(12);
        assertThat(response.isActive()).isTrue();
    }

    @Test
    @DisplayName("Obtener espacio por ID – existe")
    void getSpaceById_exists_returnsResponse() {
        when(spaceRepository.findById("space-1")).thenReturn(Optional.of(sampleSpace));
        SpaceResponse res = spaceUseCase.getSpaceById("space-1");
        assertThat(res.getName()).isEqualTo("Sala Ejecutiva A");
    }

    @Test
    @DisplayName("Obtener espacio por ID – no existe – lanza excepción")
    void getSpaceById_notFound_throws() {
        when(spaceRepository.findById("bad-id")).thenReturn(Optional.empty());
        assertThatThrownBy(() -> spaceUseCase.getSpaceById("bad-id"))
                .isInstanceOf(SpaceNotFoundException.class)
                .hasMessageContaining("bad-id");
    }

    @Test
    @DisplayName("Eliminar espacio – no existe – lanza excepción")
    void deleteSpace_notFound_throws() {
        when(spaceRepository.existsById("bad-id")).thenReturn(false);
        assertThatThrownBy(() -> spaceUseCase.deleteSpace("bad-id"))
                .isInstanceOf(SpaceNotFoundException.class);
        verify(spaceRepository, never()).deleteById(any());
    }

    @Test
    @DisplayName("Listar espacios activos")
    void getActiveSpaces_returnsList() {
        when(spaceRepository.findActive()).thenReturn(List.of(sampleSpace));
        List<SpaceResponse> list = spaceUseCase.getActiveSpaces();
        assertThat(list).hasSize(1);
        assertThat(list.get(0).isActive()).isTrue();
    }

    @Test
    @DisplayName("Tipo de espacio inválido lanza IllegalArgumentException")
    void createSpace_invalidType_throws() {
        CreateSpaceRequest req = new CreateSpaceRequest();
        req.setName("Test"); req.setType("TIPO_INVALIDO"); req.setCapacity(5); req.setFloor("P1");
        assertThatThrownBy(() -> spaceUseCase.createSpace(req))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
