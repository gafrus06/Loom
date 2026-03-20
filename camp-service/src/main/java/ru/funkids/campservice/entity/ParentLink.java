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
@Table(name = "parent_links",
        indexes = {
                @Index(name = "ix_parent_links_child", columnList = "child_id"),
                @Index(name = "ix_parent_links_parent", columnList = "parent_user_id")
        })
public class ParentLink {

    @EmbeddedId
    @AttributeOverrides({
            @AttributeOverride(name = "childId", column = @Column(name = "child_id", nullable = false)),
            @AttributeOverride(name = "parentUserId", column = @Column(name = "parent_user_id", nullable = false))
    })
    private ParentLinkId id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @MapsId("childId")
    @JoinColumn(name = "child_id", nullable = false, updatable = false, insertable = false)
    private Child child;

    @Column(length = 50)
    private String relation; // Мама/Папа/Опекун

    @Transient
    public UUID getParentUserId() {
        return id != null ? id.getParentUserId() : null;
    }
}