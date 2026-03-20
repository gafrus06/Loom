package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import ru.funkids.campservice.entity.CampInviteCode;
import ru.funkids.campservice.entity.ChildApplication;
import ru.funkids.campservice.entity.ApplicationStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ChildApplicationRepository extends JpaRepository<ChildApplication, UUID> {

    /** Все заявки по лагерю с нужным статусом — для вожатого */
    List<ChildApplication> findByCampIdAndStatusOrderByLastNameAscFirstNameAsc(
            UUID campId, ApplicationStatus status);

    /** Все заявки родителя в конкретном лагере */
    List<ChildApplication> findByCampIdAndParentUserId(UUID campId, UUID parentUserId);

    /** Проверка что у родителя уже есть заявка в этом лагере */
    boolean existsByCampIdAndParentUserId(UUID campId, UUID parentUserId);
}



