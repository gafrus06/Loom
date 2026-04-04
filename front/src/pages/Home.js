import React, { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Sidebar from "../layouts/Sidebar";
import HomeNewsFeed from "../components/HomeNewsFeed";
import { prefetchNewsFeed } from "../hooks/useNews";
import { useHomeContext } from "../hooks/useHomeContext";
import "./Home.css";

export default function Home() {
    const queryClient = useQueryClient();
    const { isLoading, contexts, defaultContext } = useHomeContext();

    useEffect(() => {
        if (isLoading) return;

        async function warmFeedCache() {
            try {
                await prefetchNewsFeed(queryClient, {
                    campId: defaultContext?.campId,
                    sessionId: defaultContext?.sessionId,
                    detachmentId: defaultContext?.detachmentId,
                    filter: "my-camp",
                });
            } catch {
                // Префетч не должен ломать главный экран.
            }
        }

        warmFeedCache();
    }, [
        defaultContext?.campId,
        defaultContext?.detachmentId,
        defaultContext?.sessionId,
        isLoading,
        queryClient,
    ]);

    if (isLoading) {
        return (
            <div className="layout">
                <Sidebar />
                <main className="main">
                    <div className="dashboard single-col">
                        <section className="col-main">
                            <div className="card feed-card">
                                {[1, 2, 3].map((item) => (
                                    <article className="feed-item" key={item}>
                                        <div className="avatar skeleton shimmer" />
                                        <div className="feed-body">
                                            <div className="skeleton shimmer line title" />
                                            <div className="skeleton shimmer line text" />
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="layout">
            <Sidebar />
            <main className="main">
                <div className="dashboard single-col">
                    <section className="col-main col-full">
                        <HomeNewsFeed
                            contexts={contexts}
                            initialContext={defaultContext}
                        />
                    </section>
                </div>
            </main>
        </div>
    );
}
