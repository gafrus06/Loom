package ru.funkids.campservice.dto;

import lombok.*;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CalendarEventResponseDto {
    private UUID id;
    private UUID campId;
    private String campName;
    private UUID sessionId;
    private String sessionTitle;
    private LocalDate eventDate;
    private String title;
    private String description;
    private UUID createdByUserId;
    private boolean visibleForParents;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
