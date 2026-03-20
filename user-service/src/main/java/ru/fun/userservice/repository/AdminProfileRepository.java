package ru.fun.userservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import ru.fun.userservice.entity.AdminProfile;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AdminProfileRepository extends JpaRepository<AdminProfile, Long> {

    Optional<AdminProfile> findByUserProfile_Id(UUID userId);

    boolean existsByUserProfile_Id(UUID userId);

    @Query("SELECT a FROM AdminProfile a WHERE a.userProfile.id IN :userIds")
    List<AdminProfile> findAllByUserProfileIdIn(@Param("userIds") Collection<UUID> userIds);
}