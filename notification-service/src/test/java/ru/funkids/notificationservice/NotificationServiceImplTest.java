package ru.funkids.notificationservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import ru.funkids.notificationservice.repository.NotificationRepository;
import ru.funkids.notificationservice.service.impl.NotificationServiceImpl;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.NOT_FOUND;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock
    private NotificationRepository notificationRepository;

    private NotificationServiceImpl service;

    @BeforeEach
    void setUp() {
        service = new NotificationServiceImpl(notificationRepository, new ObjectMapper());
    }

    @Test
    void deleteRemovesUserNotification() {
        UUID id = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(notificationRepository.deleteByIdAndUserId(id, userId)).thenReturn(1);

        service.delete(id, userId);

        verify(notificationRepository).deleteByIdAndUserId(id, userId);
    }

    @Test
    void deleteThrowsWhenNotificationNotFound() {
        UUID id = UUID.randomUUID();
        UUID userId = UUID.randomUUID();
        when(notificationRepository.deleteByIdAndUserId(id, userId)).thenReturn(0);

        ResponseStatusException exception = assertThrows(ResponseStatusException.class, () -> service.delete(id, userId));
        org.junit.jupiter.api.Assertions.assertEquals(NOT_FOUND, exception.getStatusCode());
    }
}
