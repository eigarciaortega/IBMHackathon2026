package com.corporativoalpha.frontend.dto;

import lombok.Data;

@Data
public class CreateBookingDto {
    private String spaceId;
    private String date;
    private String startTime;
    private String endTime;
    private int attendees;
    private String notes;
}
