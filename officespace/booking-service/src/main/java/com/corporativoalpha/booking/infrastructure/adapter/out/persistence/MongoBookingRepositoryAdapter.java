package com.corporativoalpha.booking.infrastructure.adapter.out.persistence;

import com.corporativoalpha.booking.domain.model.Booking;
import com.corporativoalpha.booking.domain.model.BookingStatus;
import com.corporativoalpha.booking.domain.port.out.BookingRepositoryPort;
import lombok.RequiredArgsConstructor;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class MongoBookingRepositoryAdapter implements BookingRepositoryPort {

    private final SpringDataBookingRepository repository;
    private final MongoTemplate mongoTemplate;

    @Override
    public Booking save(Booking b) {
        return toDomain(repository.save(toDocument(b)));
    }

    @Override
    public Optional<Booking> findById(String id) {
        return repository.findById(id).map(this::toDomain);
    }

    @Override
    public List<Booking> findByUserEmail(String email) {
        return repository.findByUserEmail(email).stream().map(this::toDomain).toList();
    }

    @Override
    public List<Booking> findByDate(LocalDate date) {
        return repository.findByDate(date.toString()).stream().map(this::toDomain).toList();
    }

    @Override
    public List<Booking> findConflicting(String spaceId, LocalDate date, LocalTime start, LocalTime end) {
        return repository.findConflicting(spaceId, date.toString(), start.toString(), end.toString())
                .stream().map(this::toDomain).toList();
    }

    @Override
    public void updateStatus(String id, BookingStatus status) {
        mongoTemplate.updateFirst(
            new Query(Criteria.where("id").is(id)),
            new Update().set("status", status.name()),
            BookingDocument.class
        );
    }

    private Booking toDomain(BookingDocument d) {
        return Booking.builder()
                .id(d.getId())
                .spaceId(d.getSpaceId())
                .spaceName(d.getSpaceName())
                .userEmail(d.getUserEmail())
                .userName(d.getUserName())
                .date(LocalDate.parse(d.getDate()))
                .startTime(LocalTime.parse(d.getStartTime()))
                .endTime(LocalTime.parse(d.getEndTime()))
                .attendees(d.getAttendees())
                .status(BookingStatus.valueOf(d.getStatus()))
                .notes(d.getNotes())
                .build();
    }

    private BookingDocument toDocument(Booking b) {
        BookingDocument d = new BookingDocument();
        d.setId(b.getId());
        d.setSpaceId(b.getSpaceId());
        d.setSpaceName(b.getSpaceName());
        d.setUserEmail(b.getUserEmail());
        d.setUserName(b.getUserName());
        d.setDate(b.getDate().toString());
        d.setStartTime(b.getStartTime().toString());
        d.setEndTime(b.getEndTime().toString());
        d.setAttendees(b.getAttendees());
        d.setStatus(b.getStatus().name());
        d.setNotes(b.getNotes());
        return d;
    }
}
