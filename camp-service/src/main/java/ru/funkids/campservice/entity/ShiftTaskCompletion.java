package ru.funkids.campservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "shift_task_completions",
        uniqueConstraints = @UniqueConstraint(name = "uk_shift_task_completion_task_counselor_detachment",
                columnNames = {"task_id", "counselor_user_id", "detachment_id"}),
        indexes = @Index(name = "ix_shift_task_completion_task", columnList = "task_id"))
public class ShiftTaskCompletion {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private ShiftTask task;

    @Column(name = "counselor_user_id", nullable = false)
    private UUID counselorUserId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "detachment_id")
    private Detachment detachment;

    @Column(nullable = false)
    @Builder.Default
    private boolean completed = false;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Lob
    private String comment;
}
