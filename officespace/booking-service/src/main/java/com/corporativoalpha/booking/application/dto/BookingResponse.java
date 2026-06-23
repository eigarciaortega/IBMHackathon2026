package com.corporativoalpha.booking.application.dto;

import lombok.Builder;
import lombok.Data;

@Data @Builder
public class BookingResponse {
    private String id;
    private String spaceId;
    private String spaceName;
    private String userEmail;
    private String userName;
    private String date;
    private String startTime;
    private String endTime;
    private int attendees;
    private String status;
    private String notes;
}
