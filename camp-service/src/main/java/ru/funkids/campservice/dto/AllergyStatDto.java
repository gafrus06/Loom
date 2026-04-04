package ru.funkids.campservice.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AllergyStatDto {
    private String allergy;
    private long count;
}
