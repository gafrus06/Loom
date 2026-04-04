import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";

export function renderWithProviders(ui, { queryClient } = {}) {
    const client = queryClient || new QueryClient({
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });

    return {
        queryClient: client,
        ...render(
            <QueryClientProvider client={client}>
                {ui}
            </QueryClientProvider>
        ),
    };
}
