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
public class CampPostingAccessDto {
    private UUID campId;
    private String postingMode;
    private boolean campOwner;
    private boolean acceptedStaff;
    private boolean seniorCounselor;
    private boolean canPostWithoutModeration;
    private boolean canModeratePosts;
}
