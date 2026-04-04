import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import * as campsAPI from "../services/camps";
import { getMyCamp } from "../services/campMembers";
import { useSession } from "../state/sessionStore";
import { queryKeys } from "../state/queryKeys";

function hasRole(roles, roleName) {
    return roles.some((role) => {
        const normalized = String(role).toUpperCase();
        return normalized === roleName || normalized === `ROLE_${roleName}`;
    });
}

function sortContexts(contexts) {
    return [...contexts].sort((left, right) =>
        String(left.campName || "").localeCompare(String(right.campName || ""), "ru")
    );
}

function uniqueCampContexts(contexts) {
    const byCampId = new Map();

    contexts.forEach((context) => {
        if (!context?.campId) return;

        const previous = byCampId.get(context.campId);
        if (!previous) {
            byCampId.set(context.campId, context);
            return;
        }

        const previousAssignedAt = previous?.assignedAt ? new Date(previous.assignedAt).getTime() : 0;
        const nextAssignedAt = context?.assignedAt ? new Date(context.assignedAt).getTime() : 0;

        if (nextAssignedAt >= previousAssignedAt) {
            byCampId.set(context.campId, context);
        }
    });

    return sortContexts(Array.from(byCampId.values()));
}

async function loadParentContexts() {
    const children = await campsAPI.getMyChildren();
    const contexts = await Promise.all(
        (children || []).map(async (child) => {
            const childId = child.childId || child.id;
            if (!childId) return null;

            let membership = null;
            try {
                membership = await campsAPI.getActiveMembership(childId);
            } catch {
                const memberships = await campsAPI.getChildMemberships(childId).catch(() => []);
                membership = memberships?.[0] || null;
            }

            if (!membership?.detachmentId) return null;

            const detachment = await campsAPI.getDetachment(membership.detachmentId).catch(() => null);
            if (!detachment?.campId) return null;

            return {
                campId: detachment.campId,
                campName: detachment.campName || "Лагерь",
                sessionId: detachment.sessionId || null,
                sessionName: detachment.sessionName || "Смена",
                detachmentId: detachment.id || membership.detachmentId,
                detachmentName: detachment.name || "Отряд",
                childId,
            };
        })
    );

    return uniqueCampContexts(contexts.filter(Boolean));
}

async function loadCounselorContexts() {
    const assignments = await campsAPI.getMyActiveAssignments().catch(() => []);
    const activeAssignments = (assignments || []).filter((assignment) => assignment?.active === true);

    if (activeAssignments.length === 0) {
        const membership = await getMyCamp().catch(() => null);
        if (!membership?.campId) return [];

        return [{
            campId: membership.campId,
            campName: membership.campName || "Лагерь",
            sessionId: null,
            sessionName: "",
            detachmentId: null,
            detachmentName: "",
        }];
    }

    return uniqueCampContexts(
        activeAssignments.map((assignment) => ({
            campId: assignment.campId,
            campName: assignment.campName || "Лагерь",
            sessionId: assignment.sessionId || null,
            sessionName: assignment.sessionName || "Смена",
            detachmentId: assignment.detachmentId || null,
            detachmentName: assignment.detachmentName || "Отряд",
            assignedAt: assignment.assignedAt || null,
        }))
    );
}

async function loadAdminContexts() {
    const camps = await campsAPI.getMyAccessibleCamps().catch(() => []);
    return sortContexts(
        (camps || [])
            .filter((camp) => camp?.id)
            .map((camp) => ({
                campId: camp.id,
                campName: camp.name || "Лагерь",
                sessionId: null,
                sessionName: "",
                detachmentId: null,
                detachmentName: "",
            }))
    );
}

async function fetchHomeContext(roles) {
    if (hasRole(roles, "PARENT")) return loadParentContexts();
    if (hasRole(roles, "COUNSELOR")) return loadCounselorContexts();
    if (hasRole(roles, "ADMIN")) return loadAdminContexts();
    return [];
}

export function useHomeContext() {
    const session = useSession();
    const roles = useMemo(() => session.user?.roles || [], [session.user?.roles]);

    const rolesKey = useMemo(
        () => [...roles].map((role) => String(role)).sort().join("|"),
        [roles]
    );

    const query = useQuery({
        queryKey: queryKeys.homeContext(session.user?.id, rolesKey),
        queryFn: () => fetchHomeContext(roles),
        enabled: session.isAuthenticated,
        staleTime: 30_000,
        gcTime: 10 * 60_000,
    });

    const contexts = useMemo(() => query.data || [], [query.data]);
    const isAdmin = hasRole(roles, "ADMIN");
    const isCounselor = hasRole(roles, "COUNSELOR");
    const isParent = hasRole(roles, "PARENT");

    const defaultContext = useMemo(() => {
        if (!contexts.length) return null;
        if (isAdmin) {
            const lastSelectedCamp = localStorage.getItem("lastSelectedCamp");
            return contexts.find((context) => context.campId === lastSelectedCamp) || contexts[0];
        }
        return contexts[0];
    }, [contexts, isAdmin]);

    return {
        ...query,
        contexts,
        defaultContext,
        isAdmin,
        isCounselor,
        isParent,
    };
}
