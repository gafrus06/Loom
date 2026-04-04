package ru.funkids.campservice.dto;

import lombok.Data;

import java.util.UUID;

@Data
public class CampUpdateDto {
    private String name;
    private String location;
    private String description;
    private UUID photoFileId;
}
