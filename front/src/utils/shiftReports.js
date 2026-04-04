export function parseTemplateFields(fieldsSchema) {
    if (!fieldsSchema) return [];

    try {
        const parsed = JSON.parse(fieldsSchema);
        const fields = Array.isArray(parsed?.fields) ? parsed.fields : [];

        return fields
            .map((field, index) => ({
                id: field?.id || `field_${index + 1}`,
                label: String(field?.label || '').trim(),
            }))
            .filter((field) => field.label);
    } catch {
        return [];
    }
}

export function buildTemplateFieldsSchema(labels) {
    const fields = labels
        .map((label, index) => String(label || '').trim())
        .filter(Boolean)
        .map((label, index) => ({
            id: `field_${index + 1}`,
            label,
        }));

    return JSON.stringify({ fields });
}

export function parseReportData(dataJson) {
    if (!dataJson) return {};

    try {
        const parsed = JSON.parse(dataJson);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

export function buildReportDataJson(values) {
    return JSON.stringify(values || {});
}

export function getReportStatusLabel(status) {
    const map = {
        DRAFT: 'Черновик',
        SUBMITTED: 'Отправлен',
        APPROVED: 'Принят',
        REJECTED: 'Отклонён',
    };

    return map[status] || status || 'Статус не указан';
}

export function getReportStatusClass(status) {
    const normalized = String(status || '').toLowerCase();
    if (normalized === 'approved') return 'approved';
    if (normalized === 'rejected') return 'rejected';
    if (normalized === 'draft') return 'draft';
    return 'submitted';
}

