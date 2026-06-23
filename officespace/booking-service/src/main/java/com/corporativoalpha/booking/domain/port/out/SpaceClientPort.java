package com.corporativoalpha.booking.domain.port.out;

import com.corporativoalpha.booking.application.dto.SpaceInfo;
import java.util.List;
import java.util.Optional;

public interface SpaceClientPort {
    Optional<SpaceInfo> getSpaceById(String spaceId, String token);
    List<SpaceInfo> getActiveSpaces(String token);
}
