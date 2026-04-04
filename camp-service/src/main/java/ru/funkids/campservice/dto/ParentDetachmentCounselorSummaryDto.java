package ru.funkids.campservice.dto;

import lombok.*;
import ru.funkids.campservice.entity.DetachmentRole;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParentDetachmentCounselorSummaryDto {
    private UUID userId;
    private DetachmentRole detachmentRole;
    private boolean seniorCounselor;
}
