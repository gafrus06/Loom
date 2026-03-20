package ru.funkids.campservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import ru.funkids.campservice.entity.Child;

import java.util.UUID;

@Repository
public interface ChildRepository extends JpaRepository<Child, UUID> {
}