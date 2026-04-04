package ru.funkids.campservice.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "shift_task_checklist_items", indexes = {
        @Index(name = "ix_shift_task_checklist_task", columnList = "task_id,sort_order")
})
public class ShiftTaskChecklistItem {

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

    @Column(nullable = false, length = 255)
    private String title;

    @Column(name = "required_item", nullable = false)
    @Builder.Default
    private boolean required = true;

    @Column(name = "sort_order", nullable = false)
    @Builder.Default
    private Integer sortOrder = 0;
}
