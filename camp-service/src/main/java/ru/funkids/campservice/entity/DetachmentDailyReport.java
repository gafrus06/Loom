package ru.funkids.campservice.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "detachment_daily_reports",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_detachment_daily_reports_detachment_date",
                columnNames = {"detachment_id", "report_date"}
        ),
        indexes = {
                @Index(name = "ix_detachment_daily_reports_detachment", columnList = "detachment_id"),
                @Index(name = "ix_detachment_daily_reports_session", columnList = "session_id"),
                @Index(name = "ix_detachment_daily_reports_date", columnList = "report_date")
        })
public class DetachmentDailyReport {

    @Id
    @Column(nullable = false, updatable = false)
    private UUID id;

    @PrePersist
    public void prePersist() {
        if (id == null) id = UUID.randomUUID();
    }

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "detachment_id", nullable = false)
    private Detachment detachment;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "report_template_id", nullable = false)
    private ShiftReportTemplate reportTemplate;

    @Column(name = "created_by_counselor_id", nullable = false)
    private UUID createdByCounselorId;

    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

    @Lob
    @Column(name = "data_json", nullable = false)
    private String dataJson;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private DailyReportStatus status = DailyReportStatus.SUBMITTED;

    @CreationTimestamp
    @Column(nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(nullable = false)
    private OffsetDateTime updatedAt;
}
