package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ParentLinkResponseDto {
    private UUID childId;
    private UUID parentUserId;
    private String relation;
}