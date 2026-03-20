package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChildAssignToDetachmentDto {

    @NotNull(message = "ID отряда обязателен")
    private UUID detachmentId;

    private String notes; // опциональные заметки
}