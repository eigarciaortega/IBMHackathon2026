package com.corporativoalpha.catalog.domain.port.in;

import com.corporativoalpha.catalog.application.dto.CreateSpaceRequest;
import com.corporativoalpha.catalog.application.dto.SpaceResponse;
import com.corporativoalpha.catalog.application.dto.UpdateSpaceRequest;
import java.util.List;

public interface SpaceUseCase {
    SpaceResponse createSpace(CreateSpaceRequest request);
    SpaceResponse updateSpace(String id, UpdateSpaceRequest request);
    void deleteSpace(String id);
    SpaceResponse getSpaceById(String id);
    List<SpaceResponse> getAllSpaces(String type, Integer minCapacity);
    List<SpaceResponse> getActiveSpaces();
}
