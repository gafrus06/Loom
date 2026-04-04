package ru.funkids.newsfeedservice.dto.client;

import lombok.Data;

import java.util.UUID;

@Data
public class CampPostingAccessDto {
    private UUID campId;
    private String postingMode;
    private boolean campOwner;
    private boolean acceptedStaff;
    private boolean seniorCounselor;
    private boolean canPostWithoutModeration;
    private boolean canModeratePosts;
}
