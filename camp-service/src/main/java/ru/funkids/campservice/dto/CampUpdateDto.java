package ru.funkids.campservice.dto;

import lombok.Data;

@Data
public class CampUpdateDto {
    private String name;
    private String location;
    private String description;
}