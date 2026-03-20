package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.UUID;

@Data
public class MembershipCloseDto {
    @NotNull(message = "Membership ID is required")
    private UUID membershipId;

    private String notes;
}