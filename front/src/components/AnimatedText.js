// src/components/AnimatedText.js
import React, { useEffect, useRef, memo } from 'react';
import TGSEmoji, { CUSTOM_EMOJI } from './TGSEmoji';

// ─── Noto Animated (стандартные unicode эмодзи) ───────────────────────────────

function emojiToLottieUrl(emoji) {
    try {
        const code = [...emoji]
            .map(c => c.codePointAt(0).toString(16))
            .filter(c => parseInt(c, 16) !== 0xfe0f)
            .join('_');
        return `https://fonts.gstatic.com/s/e/notoemoji/latest/${code}/lottie.json`;
    } catch { return null; }
}

const lottieCache = new Map();

const NOTO_ANIMATED = new Set([
    '1f600','1f603','1f604','1f601','1f606','1f605','1f602','1f923','1f60a','1f607',
    '1f970','1f60d','1f929','1f618','1f60b','1f61b','1f61c','1f92a','1f911','1f917',
    '1f914','1f60e','1f973','1f92f','1f631','1f97a','1f62d','1f624','1f608','1f978',
    '1f920','1f913','1f634','1f637','1f974','1f635','1f910','1f927','1f912','1f922',
    '1f92e','1f615','1f61f','1f641','2639','1f62e','1f62f','1f632','1f633','1f92d',
    '1f621','1f620','1f92c','1f47f','1f525','2764','1f9e1','1f49b','1f49a',
    '1f44b','1f44c','1f44d','1f44e','1f44f','1f450','1f64c','1f64f','1f91d','1f4aa',
    '1f9be','270a','1f91a','1f590','270b','1f596','1f918','1f919','1f91e','1f91f',
    '1f442','1f443','1f9b6','1f9b5','1faf6','1faf5','1faf4','1faf3','1faf2','1faf1',
    '1f389','1f38a','1f388','1f381','1f382','1f973','2728','1f4ab','1f4a5','1f4a3',
    '1f386','1f308','26a1','1f4a7','1f30a','1f31e','1f305','1f304','1f300','1f301','1f302',
    '26c8','1f329','1f327','1f326','1f325','1f324','1f323','1f322','1f321','26c4','2603',
    '1f331','1f340','1f342','1f343','1f339','1f490','1f4ae',
    '1f436','1f431','1f42d','1f439','1f430','1f98a','1f99d','1f408','1f415','1f40e',
    '1f984','1f98b','1f989','1f985','1f986','1f99c','1f99a','1f99b','1f992','1f418',
    '1f98f','1f42f','1f43b','1f43c','1f428','1f407','1f43f','1f987',
    '1f43a','1f417','1f434','1f40d','1f422','1f98e','1f413','1f427','1f426','1f425',
    '1f424','1f423','1f414','1f40f','1f411','1f410','1f42e','1f437','1f416','1f43d',
    '1f420','1f421','1f419','1f41a','1f41b','1f41c','1f41d','1f41e','1f577','1f578',
    '1f982','1f99f','1f9a0',
    '1f34f','1f350','1f351','1f95d','1f345','1f346','1f955','1f33d','1f344','1f95c',
    '1f330','1f35e','1f950','1f956','1f968','1f96f','1f95e','1f9c0','1f32d','1f96a',
    '1f357','1f356','1f953','1f35f','1f32e','1f32f','1f959','1f95a','1f373','1f9c7',
    '1f382','1f9c2','1f36e','1f36f','1f371','1f372','1f35d','1f35c','1f35b','1f35a',
    '1f359','1f358','1f361','1f360','1f362','1f363','1f364','1f365','1f366','1f367',
    '1f368','1f96e','1f9c6','1f95f','1f9c4','1f9c5','1f9c8','1f9c9','1f9ca',
    '1f376','1f377','1f378','1f379','1f37a','1f37b','1f942','1f943','2615','1f9c3','1f37c','1f9fe',
    '26bd','1f3c0','1f3c8','26be','1f3be','1f3d0','1f3c9','1f3b1','1f3d3',
    '1f945','1f947','1f948','1f949','1f3c6','1f3ba','1f3bb','1f941',
    '2764','1f9e1','1f49b','1f49a','1f499','1f49c','1f90d','1f90e','1f495','1f49e',
    '1f493','1f497','1f496','1f498','1f49d','1f48b','1f48c','1f48d','1f48e',
    '1f680','2728','1f4a1','1f3af','1f52e','1f512',
]);

function emojiHasLottie(emoji) {
    try {
        const code = [...emoji]
            .map(c => c.codePointAt(0).toString(16))
            .filter(c => parseInt(c, 16) !== 0xfe0f)
            .join('_');
        if (!NOTO_ANIMATED.has(code)) return false;
        if (window._noto404?.has(code)) return false;
        return true;
    } catch { return false; }
}

let lottiePromise = null;
function getLottie() {
    if (window.lottie) return Promise.resolve(window.lottie);
    if (lottiePromise) return lottiePromise;
    lottiePromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/bodymovin/5.12.2/lottie.min.js';
        script.onload = () => resolve(window.lottie);
        script.onerror = reject;
        document.head.appendChild(script);
    });
    return lottiePromise;
}

const AnimatedEmoji = memo(({ emoji, size = 24 }) => {
    const ref = useRef(null);
    const animRef = useRef(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        el.textContent = emoji;
        el.style.fontSize = `${size * 0.9}px`;

        const url = emojiToLottieUrl(emoji);
        if (!url || !emojiHasLottie(emoji)) return;

        let cancelled = false;

        const load = async () => {
            try {
                const lottie = await getLottie();
                if (cancelled || !el) return;

                let animData = lottieCache.get(url);
                if (!animData) {
                    const res = await fetch(url);
                    if (!res.ok) {
                        const code = [...emoji].map(c => c.codePointAt(0).toString(16)).filter(c => parseInt(c, 16) !== 0xfe0f).join('_');
                        window._noto404 = window._noto404 || new Set();
                        window._noto404.add(code);
                        throw new Error('404');
                    }
                    animData = await res.json();
                    lottieCache.set(url, animData);
                }

                if (cancelled || !el) return;
                el.textContent = '';

                animRef.current = lottie.loadAnimation({
                    container: el,
                    renderer: 'canvas',
                    loop: true,
                    autoplay: true,
                    animationData: JSON.parse(JSON.stringify(animData)),
                    rendererSettings: { clearCanvas: true },
                });
            } catch {
                if (el && !cancelled) el.textContent = emoji;
            }
        };

        load();
        return () => {
            cancelled = true;
            animRef.current?.destroy();
            animRef.current = null;
        };
    }, [emoji, size]);

    return (
        <span
            ref={ref}
            title={emoji}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                verticalAlign: 'middle',
                flexShrink: 0,
                width: size,
                height: size,
            }}
        />
    );
});

// ─── Парсер ───────────────────────────────────────────────────────────────────

function parseTextWithEmoji(text) {
    if (!text) return [];

    const customKeys = Object.keys(CUSTOM_EMOJI);

    // Сначала разбиваем по кастомным :name:
    if (customKeys.length > 0) {
        const customRegex = new RegExp(
            `(${customKeys.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`,
            'g'
        );
        const parts = [];
        let lastIndex = 0;
        let match;

        while ((match = customRegex.exec(text)) !== null) {
            if (match.index > lastIndex) {
                parts.push(...parseStandardEmoji(text.slice(lastIndex, match.index)));
            }
            parts.push({ type: 'custom', value: match[0] });
            lastIndex = match.index + match[0].length;
        }
        if (lastIndex < text.length) {
            parts.push(...parseStandardEmoji(text.slice(lastIndex)));
        }
        return parts;
    }

    return parseStandardEmoji(text);
}

function parseStandardEmoji(text) {
    // eslint-disable-next-line no-misleading-character-class
    const emojiRegex = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = emojiRegex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push({ type: 'text', value: text.slice(lastIndex, match.index) });
        }
        parts.push({ type: 'emoji', value: match[0] });
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) {
        parts.push({ type: 'text', value: text.slice(lastIndex) });
    }
    return parts;
}

// ─── Главный компонент ────────────────────────────────────────────────────────

export default function AnimatedText({ text, className, style, size = 26 }) {
    if (!text) return null;
    const parts = parseTextWithEmoji(text);

    return (
        <span className={className} style={{ ...style, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
      {parts.map((part, i) => {
          if (part.type === 'text') return <span key={i}>{part.value}</span>;
          if (part.type === 'custom') {
              const emoji = CUSTOM_EMOJI[part.value];
              return <TGSEmoji key={i} name={part.value} src={emoji.src} type={emoji.type} size={size} />;
          }
          return <AnimatedEmoji key={i} emoji={part.value} size={size} />;
      })}
    </span>
    );
}