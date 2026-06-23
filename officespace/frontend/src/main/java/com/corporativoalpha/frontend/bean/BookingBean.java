package com.corporativoalpha.frontend.bean;

import com.corporativoalpha.frontend.dto.BookingDto;
import com.corporativoalpha.frontend.dto.CreateBookingDto;
import com.corporativoalpha.frontend.dto.SpaceDto;
import com.corporativoalpha.frontend.service.ApiService;
import jakarta.annotation.PostConstruct;
import jakarta.faces.application.FacesMessage;
import jakarta.faces.context.FacesContext;
import jakarta.faces.view.ViewScoped;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.stereotype.Component;

import java.io.Serializable;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Getter @Setter
@Component
@ViewScoped
@RequiredArgsConstructor
public class BookingBean implements Serializable {

    private final ApiService apiService;
    private final AuthBean authBean;

    private SpaceDto selectedSpace;
    private String bookingDate;
    private String startTime;
    private String endTime;
    private int attendees = 1;
    private String notes;
    private BookingDto confirmedBooking;
    private List<BookingDto> myBookings;
    private boolean bookingConfirmed = false;

    @PostConstruct
    public void init() {
        Map<String, Object> session = FacesContext.getCurrentInstance()
            .getExternalContext().getSessionMap();
        selectedSpace = (SpaceDto) session.get("selectedSpace");
        bookingDate = (String) session.getOrDefault("searchDate", "");
        startTime = (String) session.getOrDefault("searchStartTime", "");
        endTime = (String) session.getOrDefault("searchEndTime", "");
        loadMyBookings();
    }

    public void confirmBooking() {
        if (!authBean.isAuthenticated()) return;
        CreateBookingDto dto = new CreateBookingDto();
        dto.setSpaceId(selectedSpace.getId());
        dto.setDate(bookingDate);
        dto.setStartTime(startTime);
        dto.setEndTime(endTime);
        dto.setAttendees(attendees);
        dto.setNotes(notes);

        try {
            Optional<BookingDto> result = apiService.createBooking(dto, authBean.getUserSession().getToken());
            if (result.isPresent()) {
                confirmedBooking = result.get();
                bookingConfirmed = true;
                loadMyBookings();
                FacesContext.getCurrentInstance().addMessage(null,
                    new FacesMessage(FacesMessage.SEVERITY_INFO, "Éxito", "Reserva confirmada correctamente"));
            }
        } catch (RuntimeException e) {
            FacesContext.getCurrentInstance().addMessage(null,
                new FacesMessage(FacesMessage.SEVERITY_ERROR, "Error", e.getMessage()));
        }
    }

    public void cancelBooking(BookingDto booking) {
        boolean success = apiService.cancelBooking(booking.getId(), authBean.getUserSession().getToken());
        if (success) {
            loadMyBookings();
            FacesContext.getCurrentInstance().addMessage(null,
                new FacesMessage(FacesMessage.SEVERITY_INFO, "Éxito", "Reserva cancelada"));
        } else {
            FacesContext.getCurrentInstance().addMessage(null,
                new FacesMessage(FacesMessage.SEVERITY_ERROR, "Error", "No se pudo cancelar la reserva"));
        }
    }

    public void loadMyBookings() {
        if (authBean.isAuthenticated()) {
            myBookings = apiService.getMyBookings(authBean.getUserSession().getToken());
        }
    }

    public String goToSearch() {
        return "/search.xhtml?faces-redirect=true";
    }
}
