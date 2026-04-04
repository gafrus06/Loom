package ru.funkids.newsfeedservice.dto.request;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class UpdatePostRequest {
    private String title;
    private String content;
    private JsonNode contentJson;
    private List<UUID> mediaIdsToDelete;
    private List<UUID> newImageFileIds;
    private List<UUID> newVideoFileIds;
    private Boolean isPinned;
}
