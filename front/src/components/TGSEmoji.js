import React, { memo, useEffect, useRef } from 'react';
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

function getType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    if (ext === 'tgs') return 'tgs';
    if (ext === 'webm') return 'webm';
    return 'webp';
}

export const CUSTOM_EMOJI = {};

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

const TGSPlayer = memo(({ src, size }) => {
    const ref = useRef(null);
    const animRef = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        let cancelled = false;

        loadTGS(src).then(data => {
            if (cancelled || !el) return;
            animRef.current = lottie.loadAnimation({
                container: el,
                animationData: JSON.parse(JSON.stringify(data)),
                renderer: 'canvas',
                loop: true,
                autoplay: true,
                rendererSettings: { clearCanvas: true },
            });
        }).catch(err => console.warn('TGS:', err));

        return () => {
            cancelled = true;
            animRef.current?.destroy();
            animRef.current = null;
        };
    }, [src]);

    return (
        <span
            contentEditable={false}
            style={atomicStyle(size)}
        >
            <div
                ref={ref}
                style={{ width: size, height: size, pointerEvents: 'none' }}
            />
        </span>
    );
});

const TGSEmoji = memo(({ name, src, type, size = 28 }) => {
    if (type === 'tgs') return <TGSPlayer src={src} size={size} />;

    const url = typeof src === 'string' ? src : src.default || src;

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
                    autoPlay
                    loop
                    muted
                    playsInline
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