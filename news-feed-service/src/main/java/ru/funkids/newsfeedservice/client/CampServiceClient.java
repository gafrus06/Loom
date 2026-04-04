package ru.funkids.newsfeedservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;
import ru.funkids.newsfeedservice.config.FeignConfig;
import ru.funkids.newsfeedservice.dto.client.*;

import java.util.List;
import java.util.UUID;

/**
 * Обращается к camp-service через Eureka (lb://camp-service).
 */
@FeignClient(name = "camp-service", configuration = FeignConfig.class)
public interface CampServiceClient {

    @GetMapping("/api/camps/{id}")
    CampDto getCamp(@PathVariable("id") UUID campId);

    @PostMapping("/api/camps/bulk")
    List<CampDto> getCamps(@RequestBody List<UUID> campIds);

    @GetMapping("/api/camp-settings/camp/{campId}/posting-access")
    CampPostingAccessDto getPostingAccess(@PathVariable("campId") UUID campId);

    @GetMapping("/api/camps/my-accessible")
    List<CampDto> getMyAccessibleCamps(@RequestParam("userId") UUID userId);

    @GetMapping("/api/detachments/{id}")
    DetachmentDto getDetachment(@PathVariable("id") UUID detachmentId);

    @PostMapping("/api/detachments/bulk")
    List<DetachmentDto> getDetachments(@RequestBody List<UUID> detachmentIds);

    @GetMapping("/api/parent-links/by-parent")
    List<ParentLinkDto> getMyChildren(@RequestParam("parentUserId") UUID parentUserId);

    @GetMapping("/api/memberships/child/{childId}")
    List<MembershipDto> getChildMemberships(@PathVariable("childId") UUID childId);

    @GetMapping("/api/memberships/active")
    MembershipDto getActiveMembership(@RequestParam("childId") UUID childId);

    @GetMapping("/api/counselor-assignments/my-active")
    List<CounselorAssignmentDto> getActiveAssignments(@RequestParam("userId") UUID userId);
}
