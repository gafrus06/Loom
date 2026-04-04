package ru.funkids.campservice.dto;

import lombok.*;
import ru.funkids.campservice.entity.PostingMode;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampSettingsResponseDto {
    private UUID id;
    private UUID campId;
    private String campName;
    private PostingMode postingMode;
    private boolean calendarEnabled;
    private boolean calendarVisibleForParents;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
