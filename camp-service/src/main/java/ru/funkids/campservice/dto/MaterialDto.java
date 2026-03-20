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
public class MaterialDto {
    private UUID id;
    private String title;
    private String type;
    private String stage;
    private String ageGroup;
    private String description;
    private String duration;
    private String players;
    private String materials;
    private String purpose;
    private String form;
    private String atmosphere;
    private String difficulty;
    private String effect;
    private String recommendations;
    private String content;
}