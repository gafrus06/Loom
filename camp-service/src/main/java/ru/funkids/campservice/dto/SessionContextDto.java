package ru.funkids.campservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionContextDto {
    private UUID sessionId;
    private UUID campId;
    private String campName;
    private String sessionTitle;
    private String mySubRole;
    private boolean campOwner;
    private boolean acceptedStaff;
    private boolean seniorCounselor;
    private boolean medicalWorker;
    private boolean canManageCamp;
    private boolean canManageCalendar;
    private boolean canManageShiftTasks;
    private boolean canAccessSeniorDashboard;
    private boolean canOpenCampSettings;
    private boolean calendarEnabled;
    private boolean calendarVisibleForParents;
    private String postingMode;
    @Builder.Default
    private List<SessionDayDto> shiftDays = new ArrayList<>();
}
