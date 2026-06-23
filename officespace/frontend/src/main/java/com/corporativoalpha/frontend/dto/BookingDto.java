package com.corporativoalpha.frontend.dto;

import lombok.Data;

@Data
public class BookingDto {
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
