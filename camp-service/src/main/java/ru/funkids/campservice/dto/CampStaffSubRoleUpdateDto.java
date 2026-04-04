package ru.funkids.campservice.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import ru.funkids.campservice.entity.StaffSubRole;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CampStaffSubRoleUpdateDto {

    @NotNull
    private StaffSubRole subRole;
}
