package ru.funkids.campservice.dto;

import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Data;
import ru.funkids.campservice.entity.DetachmentStage;

@Data
public class DetachmentUpdateDto {
    private String name;
    private String ageGroup;
}