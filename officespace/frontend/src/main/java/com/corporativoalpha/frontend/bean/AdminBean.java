package com.corporativoalpha.frontend.bean;

import com.corporativoalpha.frontend.dto.BookingDto;
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

@Getter @Setter
@Component
@ViewScoped
@RequiredArgsConstructor
public class AdminBean implements Serializable {

    private final ApiService apiService;
    private final AuthBean authBean;

    private List<SpaceDto> spaces;
    private List<BookingDto> todayBookings;
    private SpaceDto editingSpace = new SpaceDto();
    private boolean isEditing = false;

    @PostConstruct
    public void init() {
        if (!authBean.isAuthenticated() || !authBean.getUserSession().isAdmin()) return;
        loadData();
    }

    public void loadData() {
        String token = authBean.getUserSession().getToken();
        spaces = apiService.getSpaces(token, null, null);
        todayBookings = apiService.getTodayBookings(token);
    }

    public void newSpace() {
        editingSpace = new SpaceDto();
        isEditing = false;
    }

    public void editSpace(SpaceDto space) {
        editingSpace = space;
        isEditing = true;
    }

    public void saveSpace() {
        String token = authBean.getUserSession().getToken();
        boolean success;
        if (isEditing && editingSpace.getId() != null) {
            success = apiService.updateSpace(editingSpace.getId(), editingSpace, token);
        } else {
            success = apiService.createSpace(editingSpace, token).isPresent();
        }
        if (success) {
            loadData();
            editingSpace = new SpaceDto();
            FacesContext.getCurrentInstance().addMessage(null,
                new FacesMessage(FacesMessage.SEVERITY_INFO, "Éxito",
                    isEditing ? "Espacio actualizado" : "Espacio creado"));
            isEditing = false;
        } else {
            FacesContext.getCurrentInstance().addMessage(null,
                new FacesMessage(FacesMessage.SEVERITY_ERROR, "Error", "No se pudo guardar el espacio"));
        }
    }

    public void deleteSpace(SpaceDto space) {
        boolean success = apiService.deleteSpace(space.getId(), authBean.getUserSession().getToken());
        if (success) {
            loadData();
            FacesContext.getCurrentInstance().addMessage(null,
                new FacesMessage(FacesMessage.SEVERITY_INFO, "Éxito", "Espacio eliminado"));
        }
    }

    public long getConfirmedCount() {
        return todayBookings != null
            ? todayBookings.stream().filter(b -> "CONFIRMADA".equals(b.getStatus())).count() : 0;
    }

    public int getActiveSpacesCount() {
        return spaces != null ? (int) spaces.stream().filter(SpaceDto::isActive).count() : 0;
    }
}
