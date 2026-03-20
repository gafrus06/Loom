package ru.funkids.newsfeedservice.dto.request;

import lombok.Data;

import java.util.List;
import java.util.UUID;

@Data
public class UpdatePostRequest {
    private String title;
    private String content;
    private List<UUID> mediaIdsToDelete;

    // Boolean (не boolean) — null означает "не трогать закреп".
    // Так один запрос PUT может одновременно обновить текст и закрепить пост,
    // без отдельного PATCH /pin.
    private Boolean isPinned;
}