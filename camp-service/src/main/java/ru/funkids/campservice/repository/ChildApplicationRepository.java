package ru.funkids.campservice.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.campservice.entity.ApplicationStatus;
import ru.funkids.campservice.entity.ChildApplication;

import java.util.List;
import java.util.UUID;

public interface ChildApplicationRepository extends JpaRepository<ChildApplication, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    java.util.Optional<ChildApplication> findWithLockById(UUID id);

    List<ChildApplication> findByCampIdAndStatusOrderByLastNameAscFirstNameAsc(UUID campId, ApplicationStatus status);

    List<ChildApplication> findByCampIdAndParentUserId(UUID campId, UUID parentUserId);

    boolean existsByCampIdAndParentUserId(UUID campId, UUID parentUserId);

    long countByCampIdAndStatus(UUID campId, ApplicationStatus status);
}
