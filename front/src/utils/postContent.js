import { CUSTOM_EMOJI } from '../components/TGSEmoji';

const CUSTOM_EMOJI_KEYS = Object.keys(CUSTOM_EMOJI).sort((a, b) => b.length - a.length);

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const CUSTOM_EMOJI_REGEX = CUSTOM_EMOJI_KEYS.length
    ? new RegExp(CUSTOM_EMOJI_KEYS.map(escapeRegex).join('|'))
    : null;

function createEmptyDocument() {
    return {
        version: 1,
        blocks: [{ type: 'paragraph', text: '' }],
    };
}

function findEarliestMatch(text) {
    const patterns = [
        { type: 'link', regex: /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/ },
        { type: 'spoiler', regex: /\|\|(.+?)\|\|/ },
        { type: 'bold', regex: /\*\*(.+?)\*\*/ },
        { type: 'strike', regex: /~~(.+?)~~/ },
        { type: 'italic', regex: /_(.+?)_/ },
        ...(CUSTOM_EMOJI_REGEX ? [{ type: 'emoji', regex: CUSTOM_EMOJI_REGEX }] : []),
    ];

    let earliest = null;
    for (const pattern of patterns) {
        const match = pattern.regex.exec(text);
        if (!match) continue;
        if (!earliest || match.index < earliest.index) {
            earliest = { type: pattern.type, match, index: match.index };
        }
    }
    return earliest;
}

function parseInlineContent(text = '') {
    if (!text) return [''];

    const nodes = [];
    let source = text;

    while (source.length > 0) {
        const token = findEarliestMatch(source);
        if (!token) {
            nodes.push(source);
            break;
        }

        if (token.index > 0) {
            nodes.push(source.slice(0, token.index));
        }

        const [fullMatch, firstGroup, secondGroup] = token.match;

        switch (token.type) {
            case 'emoji':
                nodes.push({ type: 'emoji', name: fullMatch });
                break;
            case 'link':
                nodes.push({ href: secondGroup, content: parseInlineContent(firstGroup) });
                break;
            case 'spoiler':
                nodes.push({ spoiler: true, content: parseInlineContent(firstGroup) });
                break;
            case 'bold':
                nodes.push({ bold: true, content: parseInlineContent(firstGroup) });
                break;
            case 'strike':
                nodes.push({ strike: true, content: parseInlineContent(firstGroup) });
                break;
            case 'italic':
                nodes.push({ italic: true, content: parseInlineContent(firstGroup) });
                break;
            default:
                nodes.push(fullMatch);
        }

        source = source.slice(token.index + fullMatch.length);
    }

    return nodes;
}

function parseBlocks(lines, options = {}) {
    const blocks = [];
    let index = 0;
    const inQuote = Boolean(options.inQuote);

    while (index < lines.length) {
        const line = lines[index];
        const trimmed = line.trim();

        if (!trimmed) {
            index += 1;
            continue;
        }

        if (trimmed === '---') {
            blocks.push({ type: 'divider' });
            index += 1;
            continue;
        }

        if (trimmed.startsWith('## ')) {
            blocks.push({
                type: 'subheading',
                content: parseInlineContent(trimmed.slice(3).trim()),
            });
            index += 1;
            continue;
        }

        if (!inQuote && trimmed.startsWith('>') && !/^>\s+/.test(trimmed)) {
            const quoteLines = [];
            let quoteColor = 'purple';
            let first = true;

            while (index < lines.length) {
                const rawLine = lines[index];
                let workingLine = first ? rawLine.replace(/^\s*>\s?/, '') : rawLine;

                if (first) {
                    const colorMatch = workingLine.match(/^\[([a-z]+)\]/i);
                    if (colorMatch) {
                        quoteColor = colorMatch[1].toLowerCase();
                        workingLine = workingLine.slice(colorMatch[0].length);
                    }
                }

                const hasClosingMarker = /<\s*$/.test(workingLine);
                quoteLines.push(workingLine.replace(/<\s*$/, ''));
                index += 1;
                first = false;

                if (hasClosingMarker) break;
            }

            blocks.push({
                type: 'quote',
                color: quoteColor,
                blocks: parseBlocks(quoteLines, { inQuote: true }),
            });
            continue;
        }

        if (!inQuote && /^>\s+/.test(trimmed)) {
            const quoteLines = [];
            while (index < lines.length && /^>\s+/.test(lines[index].trim())) {
                quoteLines.push(lines[index].trim().replace(/^>\s+/, ''));
                index += 1;
            }
            blocks.push({
                type: 'quote',
                color: 'purple',
                blocks: parseBlocks(quoteLines, { inQuote: true }),
            });
            continue;
        }

        if (/^-\s+/.test(trimmed)) {
            const items = [];
            while (index < lines.length && /^-\s+/.test(lines[index].trim())) {
                items.push(parseInlineContent(lines[index].trim().replace(/^-\s+/, '')));
                index += 1;
            }
            blocks.push({ type: 'bullet_list', items });
            continue;
        }

        if (/^\d+\.\s+/.test(trimmed)) {
            const items = [];
            while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
                items.push(parseInlineContent(lines[index].trim().replace(/^\d+\.\s+/, '')));
                index += 1;
            }
            blocks.push({ type: 'ordered_list', items });
            continue;
        }

        const paragraphLines = [];
        while (index < lines.length) {
            const currentTrimmed = lines[index].trim();
            if (!currentTrimmed) break;
            if (
                currentTrimmed === '---' ||
                currentTrimmed.startsWith('## ') ||
                (!inQuote && currentTrimmed.startsWith('>')) ||
                /^-\s+/.test(currentTrimmed) ||
                /^\d+\.\s+/.test(currentTrimmed)
            ) {
                break;
            }
            paragraphLines.push(lines[index]);
            index += 1;
        }

        blocks.push({
            type: 'paragraph',
            content: parseInlineContent(paragraphLines.join('\n')),
        });
    }

    return blocks;
}

export function buildPostContentDocument(text = '') {
    const safeText = typeof text === 'string' ? text : '';
    const lines = safeText.split(/\r?\n/);
    const blocks = parseBlocks(lines);

    return {
        version: 1,
        blocks: blocks.length ? blocks : createEmptyDocument().blocks,
    };
}

export function buildPlainPostContentDocument(text = '') {
    return buildPostContentDocument(text);
}

export function normalizePostContentDocument(contentJson, fallbackContent = '') {
    if (contentJson && typeof contentJson === 'object') {
        return contentJson;
    }

    if (typeof contentJson === 'string') {
        try {
            const parsed = JSON.parse(contentJson);
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
        } catch (_) {
            // ignore invalid payloads and fallback to legacy content
        }
    }

    return buildPostContentDocument(fallbackContent);
}
