import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth';
import * as newsAPI from '../services/news';
import AnimatedText from './AnimatedText';
import { useAppModal } from './AppModalProvider';
import PostContentRenderer from './PostContentRenderer';
import EditRichPostModal from './EditRichPostModal';
import { usePostMediaUrls } from '../hooks/usePostMediaUrls';
import pinIcon from '../assets/news/zak.png';
import './Post.css';

function CustomVideoPlayer({ src }) {
    const videoRef = useRef(null);
    const progressRef = useRef(null);
    const [playing, setPlaying] = useState(false);
    const [muted, setMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [current, setCurrent] = useState(0);
    const [showVol, setShowVol] = useState(false);
    const [volume, setVolume] = useState(1);
    const [fullscr, setFullscr] = useState(false);

    const fmt = (s) => {
        if (!s || isNaN(s)) return '0:00';
        const m = Math.floor(s / 60);
        const sec = Math.floor(s % 60);
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    const togglePlay = () => {
        const video = videoRef.current;
        if (!video) return;
        if (video.paused) {
            video.play();
            setPlaying(true);
        } else {
            video.pause();
            setPlaying(false);
        }
    };

    const onTimeUpdate = () => {
        const video = videoRef.current;
        if (!video) return;
        setCurrent(video.currentTime);
        setProgress(video.duration ? (video.currentTime / video.duration) * 100 : 0);
    };

    const onEnded = () => setPlaying(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        video.removeAttribute('controls');
        if ('disablePictureInPicture' in video) {
            video.disablePictureInPicture = true;
        }
    }, []);

    const seek = (e) => {
        const video = videoRef.current;
        const bar = progressRef.current;
        if (!video || !bar || !video.duration) return;
        const rect = bar.getBoundingClientRect();
        video.currentTime = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * video.duration;
    };

    const toggleMute = () => {
        const video = videoRef.current;
        if (!video) return;
        video.muted = !video.muted;
        setMuted(video.muted);
    };

    const changeVolume = (e) => {
        const video = videoRef.current;
        if (!video) return;
        const val = parseFloat(e.target.value);
        video.volume = val;
        setVolume(val);
        video.muted = val === 0;
        setMuted(val === 0);
    };

    const toggleFullscreen = () => {
        const wrap = videoRef.current?.closest('.cvp-wrap');
        if (!wrap) return;
        if (!document.fullscreenElement) {
            wrap.requestFullscreen?.();
            setFullscr(true);
        } else {
            document.exitFullscreen?.();
            setFullscr(false);
        }
    };

    const volVal = muted ? 0 : volume;

    return (
        <div className="cvp-wrap">
            <video
                ref={videoRef}
                src={src}
                className="cvp-video"
                onTimeUpdate={onTimeUpdate}
                onLoadedMetadata={() => {
                    const video = videoRef.current;
                    if (video) setDuration(video.duration);
                }}
                onEnded={onEnded}
                onContextMenu={(e) => e.preventDefault()}
                playsInline
                preload="auto"
                disablePictureInPicture
                controlsList="nodownload nofullscreen noremoteplayback"
            />

            <div className="cvp-blocker" onClick={togglePlay} onContextMenu={(e) => e.preventDefault()} />

            {!playing && (
                <div className="cvp-center-play" onClick={togglePlay}>
                    <svg width="30" height="30" viewBox="0 0 24 24" fill="white">
                        <polygon points="6 3 20 12 6 21 6 3" />
                    </svg>
                </div>
            )}

            <div className="cvp-controls" onClick={(e) => e.stopPropagation()}>
                <div className="cvp-progress" ref={progressRef} onClick={seek}>
                    <div className="cvp-progress-track" />
                    <div className="cvp-progress-fill" style={{ width: `${progress}%` }} />
                    <div className="cvp-progress-thumb" style={{ left: `${progress}%` }} />
                </div>
                <div className="cvp-bottom">
                    <button className="cvp-btn" onClick={togglePlay}>
                        {playing ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                <rect x="6" y="4" width="4" height="16" />
                                <rect x="14" y="4" width="4" height="16" />
                            </svg>
                        ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="6 3 20 12 6 21 6 3" />
                            </svg>
                        )}
                    </button>
                    <span className="cvp-time">{fmt(current)} / {fmt(duration)}</span>
                    <div className="cvp-right">
                        <div
                            className="cvp-vol-wrap"
                            onMouseEnter={() => setShowVol(true)}
                            onMouseLeave={() => setShowVol(false)}
                        >
                            {showVol && (
                                <div className="cvp-vol-popup">
                                    <input
                                        type="range"
                                        min="0"
                                        max="1"
                                        step="0.02"
                                        value={volVal}
                                        onChange={changeVolume}
                                        className="cvp-vol-range"
                                    />
                                </div>
                            )}
                            <button className="cvp-btn" onClick={toggleMute}>
                                {volVal === 0 ? (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                        <line x1="23" y1="9" x2="17" y2="15" />
                                        <line x1="17" y1="9" x2="23" y2="15" />
                                    </svg>
                                ) : volVal < 0.5 ? (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                                    </svg>
                                ) : (
                                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <button className="cvp-btn" onClick={toggleFullscreen}>
                            {fullscr ? (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
                                </svg>
                            ) : (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
                                </svg>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function AnimatedLikeButton({ liked, count, onClick }) {
    const [burst, setBurst] = useState(false);
    const [particles, setParticles] = useState([]);

    const handleClick = (e) => {
        e.stopPropagation();
        onClick?.();
        if (!liked) {
            const emojis = ['\u2764\uFE0F', '\u2728', '\u{1F4AB}', '\u2B50', '\u{1F525}'];
            setParticles(Array.from({ length: 6 }, (_, i) => ({
                id: Date.now() + i,
                emoji: emojis[Math.floor(Math.random() * emojis.length)],
                angle: (360 / 6) * i + Math.random() * 30 - 15,
                distance: 28 + Math.random() * 18,
            })));
            setBurst(true);
            setTimeout(() => {
                setBurst(false);
                setParticles([]);
            }, 700);
        }
    };

    return (
        <div className="animated-like-wrap">
            {particles.map((p) => (
                <span
                    key={p.id}
                    className="like-particle"
                    style={{ '--angle': `${p.angle}deg`, '--dist': `${p.distance}px` }}
                >
                    {p.emoji}
                </span>
            ))}
            <button className={`post-card-like ${liked ? 'active' : ''} ${burst ? 'burst' : ''}`} onClick={handleClick}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill={liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                </svg>
                {count > 0 && <span>{count}</span>}
            </button>
        </div>
    );
}

function PostViewModal({
    post,
    isOpen,
    onClose,
    imageUrls,
    onLike,
    onEdit,
    onDelete,
    canEdit,
    canPin,
    onPin,
    showPinControls,
    hideDeleteAction = false
}) {
    const navigate = useNavigate();
    const [activeIdx, setActiveIdx] = useState(0);

    useEffect(() => {
        if (isOpen) setActiveIdx(0);
    }, [isOpen]);

    useEffect(() => {
        const handler = (e) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    useEffect(() => {
        if (!isOpen) return;
        const html = document.documentElement;
        const body = document.body;
        const scrollY = window.scrollY;
        const prevBodyOverflow = body.style.overflow;
        const prevHtmlOverflow = html.style.overflow;
        body.style.overflow = 'hidden';
        html.style.overflow = 'hidden';
        body.style.position = 'fixed';
        body.style.top = `-${scrollY}px`;
        body.style.width = '100%';

        const preventTouchMove = (e) => e.preventDefault();
        document.addEventListener('touchmove', preventTouchMove, { passive: false });

        return () => {
            body.style.overflow = prevBodyOverflow;
            html.style.overflow = prevHtmlOverflow;
            body.style.position = '';
            body.style.top = '';
            body.style.width = '';
            window.scrollTo(0, scrollY);
            document.removeEventListener('touchmove', preventTouchMove);
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const allMedia = post.media || [];
    const current = allMedia[activeIdx];
    const isVideo = current?.type === 'VIDEO';
    const mediaUrl = current ? imageUrls[current.fileId] : null;
    const isPinned = !!(post.pinned || post.isPinned);

    const formatDate = (d) => {
        const date = new Date(d);
        const now = new Date();
        const diff = now - date;
        if (diff < 60_000) return 'только что';
        if (diff < 3_600_000) {
            const m = Math.floor(diff / 60_000);
            return `${m} ${m === 1 ? 'минуту' : m < 5 ? 'минуты' : 'минут'} назад`;
        }
        if (diff < 86_400_000) {
            const h = Math.floor(diff / 3_600_000);
            return `${h} ${h === 1 ? 'час' : h < 5 ? 'часа' : 'часов'} назад`;
        }
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
    };

    return (
        <div className="modal-overlay post-view-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="pvm-wrap">
                {isPinned && showPinControls && (
                    <div className="post-view-pin" title="Закрепленный пост">
                        <img src={pinIcon} alt="" className="post-view-pin-icon" />
                    </div>
                )}
                <button className="post-view-close" onClick={onClose}>×</button>

                {allMedia.length > 0 && (
                    <div className="pvm-media">
                        <div className="pvm-media-main">
                            {mediaUrl ? (
                                isVideo ? (
                                    <CustomVideoPlayer key={mediaUrl} src={mediaUrl} />
                                ) : (
                                    <img src={mediaUrl} alt="post" className="pvm-media-el" />
                                )
                            ) : (
                                <div className="pvm-media-loader"><div className="spinner-small" /></div>
                            )}
                        </div>

                        {allMedia.length > 1 && (
                            <div className="pvm-thumbs">
                                {allMedia.map((m, i) => (
                                    <div key={m.fileId || i} className={`pvm-thumb ${i === activeIdx ? 'active' : ''}`} onClick={() => setActiveIdx(i)}>
                                        {imageUrls[m.fileId]
                                            ? m.type === 'VIDEO'
                                                ? <div className="pvm-thumb-video">▶</div>
                                                : <img src={imageUrls[m.fileId]} alt="" />
                                            : <div className="thumb-placeholder" />}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                <div className={`pvm-content ${allMedia.length === 0 ? 'no-media' : ''}`}>
                    <div className="pvm-author" onClick={() => { navigate(`/users/${post.author?.id}`); onClose(); }}>
                        <div className="post-author-avatar">
                            {post.author?.avatarUrl
                                ? <img src={post.author.avatarUrl} alt="" />
                                : <div className="avatar-fallback">{post.author?.firstName?.[0]}{post.author?.lastName?.[0]}</div>}
                        </div>
                        <div className="post-author-info">
                            <span className="post-author-name">{post.author?.firstName} {post.author?.lastName}</span>
                            <span className="post-meta">{post.camp?.name}{post.detachment?.name ? ` • ${post.detachment.name}` : ''}</span>
                        </div>
                    </div>

                    <div className="pvm-body">
                        {post.title && <h3 className="post-title"><AnimatedText text={post.title} size={22} /></h3>}
                        <PostContentRenderer content={post.content} contentJson={post.contentJson} className="post-text post-text-rich" />
                    </div>

                    <div className="pvm-actions">
                        <button className={`post-action-btn like-btn ${post.userInteraction?.liked ? 'active' : ''}`} onClick={onLike}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={post.userInteraction?.liked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
                                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                            </svg>
                            {post.stats?.likesCount > 0 && <span>{post.stats.likesCount}</span>}
                        </button>

                        {(canEdit || (showPinControls && canPin)) && (
                            <div className="pvm-menu-wrap">
                                <button className="post-action-btn pvm-menu-btn" onClick={(e) => {
                                    e.stopPropagation();
                                    e.currentTarget.closest('.pvm-menu-wrap').classList.toggle('open');
                                }}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                        <circle cx="5" cy="12" r="2" />
                                        <circle cx="12" cy="12" r="2" />
                                        <circle cx="19" cy="12" r="2" />
                                    </svg>
                                </button>
                                <div className="pvm-menu-dropdown" onClick={(e) => e.stopPropagation()}>
                                    {showPinControls && canPin && (
                                        <button className="pvm-menu-item" onClick={() => {
                                            onPin();
                                            document.querySelector('.pvm-menu-wrap.open')?.classList.remove('open');
                                        }}>
                                            {isPinned ? 'Открепить' : 'Закрепить'}
                                        </button>
                                    )}
                                    {canEdit && (
                                        <>
                                            <button className="pvm-menu-item" onClick={() => {
                                                onEdit();
                                                document.querySelector('.pvm-menu-wrap.open')?.classList.remove('open');
                                            }}>
                                                Редактировать
                                            </button>
                                            {!hideDeleteAction && (
                                                <button className="pvm-menu-item danger" onClick={() => {
                                                    onDelete();
                                                    document.querySelector('.pvm-menu-wrap.open')?.classList.remove('open');
                                                }}>
                                                    Удалить
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                        <span className="pvm-date">{formatDate(post.createdAt)}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function Post({
    post,
    onUpdate,
    onDelete,
    onLike,
    showPinControls = false,
    forceCanEdit = false,
    forceCanPin = false,
    hideDeleteAction = false
}) {
    const [showView, setShowView] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);

    const currentUser = getCurrentUser();
    const { confirm, showError } = useAppModal();
    const isAuthor = currentUser?.id === post.author?.id;
    const isAdmin = currentUser?.roles?.some((r) => r === 'ADMIN' || r === 'ROLE_ADMIN');
    const canEdit = forceCanEdit || isAuthor || isAdmin;
    const canPin = forceCanPin || isAdmin;
    const isPinned = !!(post.pinned || post.isPinned);
    const {
        data: imageUrls = {},
        isLoading: isLoadingMedia,
    } = usePostMediaUrls(post.media || []);

    const firstMedia = post.media?.[0];
    const isFirstVideo = firstMedia?.type === 'VIDEO';
    const coverUrl = firstMedia ? imageUrls[firstMedia.fileId] : null;
    const isLoadingCover = Boolean(firstMedia) && isLoadingMedia && !coverUrl;

    const formatDate = (d) => {
        const date = new Date(d);
        const now = new Date();
        const diff = now - date;
        if (diff < 3_600_000) return `${Math.max(1, Math.floor(diff / 60_000))} мин`;
        if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)} ч`;
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
    };

    const handlePin = async (e) => {
        e?.preventDefault();
        e?.stopPropagation();
        try {
            const updated = await newsAPI.togglePin(post.id, !isPinned);
            onUpdate?.(updated);
        } catch (err) {
            console.error('Pin error:', err);
        }
    };

    const handleDelete = async () => {
        const approved = await confirm({
            title: 'Удалить пост?',
            message: 'Это действие нельзя отменить.',
            confirmLabel: 'Удалить',
            cancelLabel: 'Отмена',
            danger: true,
        });
        if (!approved) return;
        setIsDeleting(true);
        setShowView(false);
        try {
            await newsAPI.deletePost(post.id);
            onDelete?.(post.id);
        } catch {
            showError('Ошибка удаления', 'Не удалось удалить пост');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <article
                className={`post-card ${isDeleting ? 'deleting' : ''} ${isPinned && showPinControls ? 'pinned' : ''}`}
                onClick={() => setShowView(true)}
            >
                {isPinned && showPinControls && (
                    <div className="post-card-pin" title="Закрепленный пост">
                        <img src={pinIcon} alt="" className="post-card-pin-icon" />
                    </div>
                )}

                <div className="post-card-cover">
                    {isLoadingCover ? (
                        <div className="post-card-cover-loading"><div className="spinner-small" /></div>
                    ) : coverUrl && isFirstVideo ? (
                        <video src={coverUrl} className="post-card-img" autoPlay muted loop playsInline preload="auto" />
                    ) : coverUrl ? (
                        <img src={coverUrl} alt="cover" className="post-card-img" />
                    ) : (
                        <div className="post-card-no-img">
                            {post.title ? (
                                <p className="post-card-no-img-title"><AnimatedText text={post.title} size={22} /></p>
                            ) : (
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M20 5H4V19L13.2923 9.70649C13.6828 9.31595 14.3159 9.31591 14.7065 9.70641L20 15.0104V5ZM2 3.9934C2 3.44476 2.45531 3 2.9918 3H21.0082C21.556 3 22 3.44495 22 3.9934V20.0066C22 20.5552 21.5447 21 21.0082 21H2.9918C2.44405 21 2 20.5551 2 20.0066V3.9934ZM8 11C6.89543 11 6 10.1046 6 9C6 7.89543 6.89543 7 8 7C9.10457 7 10 7.89543 10 9C10 10.1046 9.10457 11 8 11Z" />
                                </svg>
                            )}
                        </div>
                    )}
                </div>

                <div className="post-card-hover-overlay">
                    <div className="post-card-hover-top">
                        {post.title && <p className="post-card-hover-title"><AnimatedText text={post.title} size={17} /></p>}
                        <PostContentRenderer
                            content={post.content}
                            contentJson={post.contentJson}
                            className="post-card-hover-desc post-card-hover-desc-rich"
                        />
                    </div>
                    <div className="post-card-hover-bottom">
                        <div className="post-card-author">
                            <div className="post-card-avatar">
                                {post.author?.avatarUrl
                                    ? <img src={post.author.avatarUrl} alt="" />
                                    : <div className="avatar-fallback sm">{post.author?.firstName?.[0]}{post.author?.lastName?.[0]}</div>}
                            </div>
                            <span className="post-card-author-name">{post.author?.firstName} {post.author?.lastName?.[0]}.</span>
                            <span className="post-card-date">{formatDate(post.createdAt)}</span>
                        </div>
                        <div className="post-card-actions">
                            <AnimatedLikeButton liked={post.userInteraction?.liked} count={post.stats?.likesCount} onClick={() => onLike?.()} />
                        </div>
                    </div>
                </div>
            </article>

            <PostViewModal
                post={post}
                isOpen={showView}
                onClose={() => setShowView(false)}
                imageUrls={imageUrls}
                onLike={() => onLike?.()}
                onEdit={() => {
                    setShowView(false);
                    setTimeout(() => setShowEdit(true), 150);
                }}
                onDelete={handleDelete}
                canEdit={canEdit}
                canPin={canPin}
                onPin={handlePin}
                showPinControls={showPinControls}
                hideDeleteAction={hideDeleteAction}
            />

            <EditRichPostModal
                post={post}
                isOpen={showEdit}
                onClose={() => setShowEdit(false)}
                onUpdate={onUpdate}
            />
        </>
    );
}
