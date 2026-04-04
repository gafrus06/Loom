package ru.funkids.campservice;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.funkids.campservice.dto.ChildApplicationResponseDto;
import ru.funkids.campservice.entity.*;
import ru.funkids.campservice.repository.*;
import ru.funkids.campservice.service.CampAuthOutboxService;
import ru.funkids.campservice.service.impl.ChildApplicationServiceImpl;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ChildApplicationServiceImplTest {

    @Mock private ChildApplicationRepository applicationRepository;
    @Mock private CampInviteCodeRepository inviteCodeRepository;
    @Mock private CampParentRepository campParentRepository;
    @Mock private CampRepository campRepository;
    @Mock private ChildRepository childRepository;
    @Mock private DetachmentRepository detachmentRepository;
    @Mock private CampAuthOutboxService campAuthOutboxService;

    @InjectMocks
    private ChildApplicationServiceImpl service;

    @Test
    void confirmApplicationCreatesChildAndEnqueuesParentRoleAssignment() {
        UUID applicationId = UUID.randomUUID();
        UUID parentUserId = UUID.randomUUID();
        UUID counselorUserId = UUID.randomUUID();
        UUID detachmentId = UUID.randomUUID();

        ChildApplication application = ChildApplication.builder()
                .id(applicationId)
                .campId(UUID.randomUUID())
                .parentUserId(parentUserId)
                .firstName("Test")
                .lastName("Child")
                .birthDate(LocalDate.of(2015, 1, 1))
                .status(ApplicationStatus.PENDING)
                .relation("MOTHER")
                .build();

        Camp camp = Camp.builder().id(UUID.randomUUID()).name("Camp").build();
        Session session = Session.builder().id(UUID.randomUUID()).camp(camp).title("Shift").build();
        Detachment detachment = Detachment.builder().id(detachmentId).session(session).build();

        when(applicationRepository.findWithLockById(applicationId)).thenReturn(Optional.of(application));
        when(detachmentRepository.findById(detachmentId)).thenReturn(Optional.of(detachment));
        when(childRepository.save(any())).thenAnswer(inv -> {
            Child child = inv.getArgument(0);
            if (child.getMemberships() == null) {
                child.setMemberships(new ArrayList<>());
            }
            if (child.getParentLinks() == null) {
                child.setParentLinks(new ArrayList<>());
            }
            child.setId(UUID.randomUUID());
            return child;
        });

        ChildApplicationResponseDto response = service.confirmApplication(applicationId, detachmentId, counselorUserId);

        assertEquals(ApplicationStatus.CONFIRMED, response.status());
        assertNotNull(response.childId());
        verify(campAuthOutboxService).enqueueAssignRole(parentUserId, "ROLE_PARENT");
    }
}
