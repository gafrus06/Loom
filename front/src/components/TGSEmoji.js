import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import lottie from 'lottie-web';
import pako from 'pako';

const webmContext = require.context('../assets/custom', false, /\.webm$/);
const webpContext = require.context('../assets/custom', false, /\.webp$/);

let tgsManifest = [];
try {
    // eslint-disable-next-line import/no-webpack-loader-syntax
    tgsManifest = require('../assets/custom/manifest.json');
} catch (e) {
    // manifest ещё не создан
}

function fileToKey(filename) {
    let hash = 0;
    for (let i = 0; i < filename.length; i++) {
        hash = ((hash << 5) - hash) + filename.charCodeAt(i);
        hash |= 0;
    }
    const num = Math.abs(hash) % 1000000;
    return ':' + String(num).padStart(6, '0') + ':';
}

function getBaseName(filename) {
    return filename.replace(/\.[^.]+$/, '');
}

export const CUSTOM_EMOJI = {};
const previewByBaseName = new Map();

webpContext.keys().forEach(path => {
    const filename = path.replace('./', '');
    previewByBaseName.set(getBaseName(filename), webpContext(path));
});

webmContext.keys().forEach(path => {
    const filename = path.replace('./', '');
    const key = fileToKey(filename);
    CUSTOM_EMOJI[key] = { src: webmContext(path), type: 'webm', filename };
});

webpContext.keys().forEach(path => {
    const filename = path.replace('./', '');
    const key = fileToKey(filename);
    CUSTOM_EMOJI[key] = { src: webpContext(path), type: 'webp', filename };
});

tgsManifest.forEach(filename => {
    const key = fileToKey(filename);
    CUSTOM_EMOJI[key] = { src: `/custom/${filename}`, type: 'tgs', filename };
});

const tgsCache = new Map();

async function loadTGS(url) {
    if (tgsCache.has(url)) return tgsCache.get(url);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed: ${url}`);
    const buf = await res.arrayBuffer();
    const json = pako.inflate(new Uint8Array(buf), { to: 'string' });
    const data = JSON.parse(json);
    tgsCache.set(url, data);
    return data;
}

// Общий стиль враппера — атомарный символ как в Telegram
const atomicStyle = (size) => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    verticalAlign: 'middle',
    flexShrink: 0,
    width: size,
    height: size,
    userSelect: 'none',        // нельзя выделить внутренности
    WebkitUserSelect: 'none',
    cursor: 'text',            // курсор не меняется при наведении
    lineHeight: 1,
});

const placeholderStyle = (size) => ({
    width: size,
    height: size,
    borderRadius: '999px',
    background: '#050505',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.04)',
});

const softPlaceholderStyle = (size) => ({
    width: size,
    height: size,
    borderRadius: '999px',
    background: 'rgba(255,255,255,0.08)',
    boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
});

const TGSPlayer = memo(({ src, size, animate = true }) => {
    const ref = useRef(null);
    const animRef = useRef(null);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        let cancelled = false;
        setLoaded(false);

        loadTGS(src).then(data => {
            if (cancelled || !el) return;
            animRef.current = lottie.loadAnimation({
                container: el,
                animationData: JSON.parse(JSON.stringify(data)),
                renderer: 'canvas',
                loop: true,
                autoplay: false,
                rendererSettings: { clearCanvas: true },
            });

            if (animate) {
                animRef.current.play();
            } else {
                animRef.current.goToAndStop(0, true);
            }
            setLoaded(true);
        }).catch(err => console.warn('TGS:', err));

        return () => {
            cancelled = true;
            animRef.current?.destroy();
            animRef.current = null;
        };
    }, [src, animate]);

    useEffect(() => {
        if (!animRef.current) return;
        if (animate) {
            animRef.current.play();
        } else {
            animRef.current.goToAndStop(0, true);
        }
    }, [animate]);

    return (
        <span
            contentEditable={false}
            style={atomicStyle(size)}
        >
            <span
                ref={ref}
                style={{
                    display: 'block',
                    width: size,
                    height: size,
                    pointerEvents: 'none',
                    opacity: loaded ? 1 : 0,
                }}
            />
        </span>
    );
});

const TGSEmoji = memo(({
    name,
    src,
    type,
    size = 28,
    animate = true,
    mountAnimation = true,
    previewSrc = null,
    filename = '',
    fallbackMode = 'placeholder',
}) => {
    const resolvedPreview = useMemo(() => {
        if (previewSrc) return previewSrc;
        if (!filename) return null;
        return previewByBaseName.get(getBaseName(filename)) || null;
    }, [previewSrc, filename]);

    const url = typeof src === 'string' ? src : src.default || src;

    const previewElement = resolvedPreview ? (
        <span
            contentEditable={false}
            title={name}
            style={atomicStyle(size)}
        >
            <img
                src={typeof resolvedPreview === 'string' ? resolvedPreview : resolvedPreview.default || resolvedPreview}
                width={size}
                height={size}
                alt={name}
                loading="lazy"
                style={{ display: 'block', objectFit: 'contain', pointerEvents: 'none' }}
            />
        </span>
    ) : (
        <span
            contentEditable={false}
            title={name}
            style={atomicStyle(size)}
        >
            <span style={fallbackMode === 'soft' ? softPlaceholderStyle(size) : placeholderStyle(size)} />
        </span>
    );

    if (type === 'tgs') {
        if (!mountAnimation) return previewElement;
        return <TGSPlayer src={src} size={size} animate={animate} />;
    }

    if (!mountAnimation || !animate) return previewElement;

    if (type === 'webm') {
        return (
            <span
                contentEditable={false}
                title={name}
                style={atomicStyle(size)}
            >
                <video
                    src={url}
                    width={size}
                    height={size}
                    autoPlay={animate}
                    loop
                    muted
                    playsInline
                    preload={animate ? 'metadata' : 'none'}
                    style={{ display: 'block', objectFit: 'contain', pointerEvents: 'none' }}
                />
            </span>
        );
    }

    return (
        <span
            contentEditable={false}
            title={name}
            style={atomicStyle(size)}
        >
            <img
                src={url}
                width={size}
                height={size}
                alt={name}
                style={{ display: 'block', objectFit: 'contain', pointerEvents: 'none' }}
            />
        </span>
    );
});

export default TGSEmoji;
