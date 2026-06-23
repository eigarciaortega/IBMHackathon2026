package org.portfolio.bookingservice.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.portfolio.bookingservice.dto.analytics.AnalyticsDashboardResponse;
import org.portfolio.bookingservice.service.AnalyticsService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/analytics")
@RequiredArgsConstructor
@Tag(name = "Analytics")
@SecurityRequirement(name = "bearerAuth")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    @GetMapping("/dashboard")
    @Operation(summary = "Analytics dashboard — KPIs and charts data (Admin)")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AnalyticsDashboardResponse> dashboard() {
        return ResponseEntity.ok(analyticsService.getDashboard());
    }
}
