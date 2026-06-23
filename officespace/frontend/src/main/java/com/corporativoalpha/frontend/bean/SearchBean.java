package com.corporativoalpha.frontend.bean;

import com.corporativoalpha.frontend.dto.SpaceDto;
import com.corporativoalpha.frontend.service.ApiService;
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
public class SearchBean implements Serializable {

    private final ApiService apiService;
    private final AuthBean authBean;

    private String selectedType;
    private Integer minCapacity;
    private String selectedDate;
    private String startTime;
    private String endTime;
    private List<SpaceDto> availableSpaces;
    private SpaceDto selectedSpace;
    private boolean searched = false;

    public void searchSpaces() {
        if (!authBean.isAuthenticated()) return;
        availableSpaces = apiService.getSpaces(authBean.getUserSession().getToken(),
                selectedType, minCapacity);
        searched = true;
    }

    public String selectSpace(SpaceDto space) {
        this.selectedSpace = space;
        FacesContext.getCurrentInstance().getExternalContext()
            .getSessionMap().put("selectedSpace", space);
        FacesContext.getCurrentInstance().getExternalContext()
            .getSessionMap().put("searchDate", selectedDate);
        FacesContext.getCurrentInstance().getExternalContext()
            .getSessionMap().put("searchStartTime", startTime);
        FacesContext.getCurrentInstance().getExternalContext()
            .getSessionMap().put("searchEndTime", endTime);
        return "/booking.xhtml?faces-redirect=true";
    }

    public boolean isNoResults() {
        return searched && (availableSpaces == null || availableSpaces.isEmpty());
    }
}
