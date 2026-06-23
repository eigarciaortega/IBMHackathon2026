package org.portfolio.bookingservice.service;

import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.portfolio.bookingservice.entity.Booking;
import org.portfolio.bookingservice.repository.BookingRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExportService {

    private final BookingRepository bookingRepository;

    private static final String[] HEADERS = {
            "ID Reserva", "ID Espacio", "ID Usuario", "Fecha",
            "Hora Inicio", "Hora Fin", "Asistentes", "Estado", "Notas", "Creada el"
    };

    public byte[] exportToExcel(LocalDate from, LocalDate to) throws IOException {
        List<Booking> bookings = getBookings(from, to);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Reservas");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.DARK_BLUE.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < HEADERS.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(HEADERS[i]);
                cell.setCellStyle(headerStyle);
            }

            int rowNum = 1;
            for (Booking b : bookings) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(b.getPublicId().toString());
                row.createCell(1).setCellValue(b.getSpacePublicId().toString());
                row.createCell(2).setCellValue(b.getUserId());
                row.createCell(3).setCellValue(b.getBookingDate().toString());
                row.createCell(4).setCellValue(b.getStartTime().toString());
                row.createCell(5).setCellValue(b.getEndTime().toString());
                row.createCell(6).setCellValue(b.getAttendees());
                row.createCell(7).setCellValue(b.getStatus().name());
                row.createCell(8).setCellValue(b.getNotes() != null ? b.getNotes() : "");
                row.createCell(9).setCellValue(b.getCreatedAt().toString());
            }

            for (int i = 0; i < HEADERS.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        }
    }

    public String exportToCsv(LocalDate from, LocalDate to) {
        List<Booking> bookings = getBookings(from, to);
        StringBuilder sb = new StringBuilder();
        sb.append(String.join(",", HEADERS)).append("\n");

        for (Booking b : bookings) {
            sb.append(String.join(",",
                    b.getPublicId().toString(),
                    b.getSpacePublicId().toString(),
                    b.getUserId().toString(),
                    b.getBookingDate().toString(),
                    b.getStartTime().toString(),
                    b.getEndTime().toString(),
                    b.getAttendees().toString(),
                    b.getStatus().name(),
                    b.getNotes() != null ? "\"" + b.getNotes().replace("\"", "\"\"") + "\"" : "",
                    b.getCreatedAt().toString()
            )).append("\n");
        }

        return sb.toString();
    }

    private List<Booking> getBookings(LocalDate from, LocalDate to) {
        if (from != null && to != null) {
            return bookingRepository.findAll().stream()
                    .filter(b -> !b.getBookingDate().isBefore(from) && !b.getBookingDate().isAfter(to))
                    .sorted((a, c) -> c.getBookingDate().compareTo(a.getBookingDate()))
                    .toList();
        }
        return bookingRepository.findAllByOrderByBookingDateDescStartTimeDesc();
    }
}
