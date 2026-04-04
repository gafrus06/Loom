package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.*;
import ru.funkids.campservice.entity.PostingMode;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CampSettingsUpsertDto {
    @NotNull
    private UUID campId;
    @NotNull
    private PostingMode postingMode;
    private boolean calendarEnabled;
    private boolean calendarVisibleForParents;
}
