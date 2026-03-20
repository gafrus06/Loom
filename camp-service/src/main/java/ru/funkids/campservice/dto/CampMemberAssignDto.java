package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CampMemberAssignDto {

    @NotNull
    private UUID campId;

    @NotNull
    private UUID userId;

    /**
     * Смены, к которым нужно привязать вожатого.
     * Может содержать одну или несколько смен.
     * При повторном вызове новые смены добавляются к уже существующим
     * (не заменяют их).
     */
    @NotEmpty(message = "Необходимо указать хотя бы одну смену")
    private List<UUID> sessionIds;
}