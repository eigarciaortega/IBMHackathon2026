package com.corporativoalpha.booking.infrastructure.adapter.out.persistence;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Document(collection = "bookings")
@CompoundIndex(def = "{'spaceId': 1, 'date': 1, 'status': 1}")
public class BookingDocument {
    @Id private String id;
    private String spaceId;
    private String spaceName;
    private String userEmail;
    private String userName;
    private String date;       // ISO: YYYY-MM-DD
    private String startTime;  // HH:mm
    private String endTime;    // HH:mm
    private int attendees;
    private String status;     // CONFIRMADA | CANCELADA
    private String notes;
}
