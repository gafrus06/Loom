package ru.funkids.campservice.dto;

import lombok.*;
import ru.funkids.campservice.entity.DetachmentStage;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParentDetachmentViewDto {
    private UUID detachmentId;
    private String detachmentName;
    private String ageGroup;
    private DetachmentStage stage;
    private UUID sessionId;
    private String sessionTitle;
    private UUID campId;
    private String campName;
    @Builder.Default
    private List<ParentDetachmentCounselorSummaryDto> counselors = new ArrayList<>();
    @Builder.Default
    private List<ParentDetachmentChildSummaryDto> children = new ArrayList<>();
    @Builder.Default
    private List<ParentOwnChildDetailsDto> myChildren = new ArrayList<>();
    private Integer totalChildren;
    @Builder.Default
    private List<ParentDetachmentJournalResponseDto> journals = new ArrayList<>();
}
