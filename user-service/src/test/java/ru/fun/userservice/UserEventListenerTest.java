package ru.fun.userservice;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.fun.userservice.dto.auth.UserRegisteredEvent;
import ru.fun.userservice.dto.auth.UserRoleChangedEvent;
import ru.fun.userservice.entity.UserProfile;
import ru.fun.userservice.repository.AdminProfileRepository;
import ru.fun.userservice.repository.CounselorProfileRepository;
import ru.fun.userservice.repository.ParentProfileRepository;
import ru.fun.userservice.repository.ProcessedAuthEventRepository;
import ru.fun.userservice.repository.UserProfileRepository;
import ru.fun.userservice.service.CounselorProfileService;
import ru.fun.userservice.kafka.UserEventListener;

import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserEventListenerTest {

    @Mock private UserProfileRepository userProfileRepository;
    @Mock private ParentProfileRepository parentProfileRepository;
    @Mock private CounselorProfileRepository counselorProfileRepository;
    @Mock private AdminProfileRepository adminProfileRepository;
    @Mock private CounselorProfileService counselorProfileService;
    @Mock private ProcessedAuthEventRepository processedAuthEventRepository;

    @InjectMocks
    private UserEventListener listener;

    @Test
    void roleEventBeforeUserRegistrationFailsAndIsNotMarkedProcessed() {
        UUID userId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        UserRoleChangedEvent event = new UserRoleChangedEvent();
        event.setEventId(eventId);
        event.setUserId(userId.toString());
        event.setRole("ROLE_PARENT");
        event.setAction("ASSIGNED");

        when(processedAuthEventRepository.existsById(eventId)).thenReturn(false);
        when(parentProfileRepository.existsByUserProfile_Id(userId)).thenReturn(false);
        when(userProfileRepository.findById(userId)).thenReturn(Optional.empty());

        assertThrows(IllegalStateException.class, () -> listener.handleUserRoleChanged(event));
        verify(processedAuthEventRepository, never()).save(any());
    }

    @Test
    void duplicateRegisteredEventWithExistingProfileIsSkipped() {
        UUID eventId = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        UserRegisteredEvent event = new UserRegisteredEvent();
        event.setEventId(eventId);
        event.setUserId(userId.toString());
        event.setEmail("test@example.com");

        when(userProfileRepository.existsById(userId)).thenReturn(true);

        listener.handleUserRegistered(event);

        verify(userProfileRepository, never()).save(any());
        verify(processedAuthEventRepository).save(any());
    }

    @Test
    void duplicateRegisteredEventWithoutProfileRecreatesProfile() {
        UUID userId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        UserRegisteredEvent event = new UserRegisteredEvent();
        event.setEventId(eventId);
        event.setUserId(userId.toString());
        event.setEmail("test@example.com");

        when(userProfileRepository.existsById(userId)).thenReturn(false);
        when(processedAuthEventRepository.existsById(eventId)).thenReturn(true);

        listener.handleUserRegistered(event);

        verify(userProfileRepository).save(any(UserProfile.class));
        verify(processedAuthEventRepository).save(any());
    }

    @Test
    void registeredEventCreatesProfileAndMarksProcessed() {
        UUID userId = UUID.randomUUID();
        UUID eventId = UUID.randomUUID();
        UserRegisteredEvent event = new UserRegisteredEvent();
        event.setEventId(eventId);
        event.setUserId(userId.toString());
        event.setEmail("test@example.com");

        when(processedAuthEventRepository.existsById(eventId)).thenReturn(false);
        when(userProfileRepository.existsById(userId)).thenReturn(false);

        listener.handleUserRegistered(event);

        verify(userProfileRepository).save(any(UserProfile.class));
        verify(processedAuthEventRepository).save(any());
    }
}
