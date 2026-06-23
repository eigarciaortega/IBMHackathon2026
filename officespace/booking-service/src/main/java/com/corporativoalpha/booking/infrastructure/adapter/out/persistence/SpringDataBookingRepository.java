package com.corporativoalpha.booking.infrastructure.adapter.out.persistence;

import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.List;

public interface SpringDataBookingRepository extends MongoRepository<BookingDocument, String> {
    List<BookingDocument> findByUserEmail(String email);
    List<BookingDocument> findByDate(String date);

    /**
     * Overlap detection query for confirmed bookings:
     * A conflict exists when:
     *   existing.startTime < requested.endTime AND existing.endTime > requested.startTime
     */
    @Query("{'spaceId': ?0, 'date': ?1, 'status': 'CONFIRMADA', 'startTime': {$lt: ?3}, 'endTime': {$gt: ?2}}")
    List<BookingDocument> findConflicting(String spaceId, String date, String startTime, String endTime);
}
