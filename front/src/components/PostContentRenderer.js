import React from 'react';
import TGSEmoji, { CUSTOM_EMOJI } from './TGSEmoji';
import { normalizePostContentDocument } from '../utils/postContent';

function wrapInlineMarks(node, children) {
    let result = children;

    if (node.href) {
        result = (
            <a href={node.href} target="_blank" rel="noreferrer" className="post-rich-link">
                {result}
            </a>
        );
    }

    if (node.spoiler) result = <span className="post-rich-spoiler">{result}</span>;
    if (node.strike) result = <s>{result}</s>;
    if (node.italic) result = <em>{result}</em>;
    if (node.bold) result = <strong>{result}</strong>;

    return result;
}

export default function PostContentRenderer({ content, contentJson, className = '', animateEmoji = true }) {
    const document = normalizePostContentDocument(contentJson, content);
    const blocks = Array.isArray(document?.blocks) ? document.blocks : [];

    return (
        <div className={`post-rich-content ${className}`.trim()}>
            {renderBlocks(blocks, 'post-block', { animateEmoji })}
        </div>
    );
}

function renderBlocks(blocks, keyPrefix, options) {
    return (Array.isArray(blocks) ? blocks : []).map((block, index) => (
        <React.Fragment key={`${keyPrefix}-${index}`}>
            {renderBlockWithOptions(block, `${keyPrefix}-${index}`, options)}
        </React.Fragment>
    ));
}

function renderBlockWithOptions(block, key, options) {
    const inlineContent = Array.isArray(block.content)
        ? block.content.map((node, nodeIndex) => (
            <React.Fragment key={`${key}-node-${nodeIndex}`}>
                {renderInlineNodeWithOptions(node, `${key}-node-${nodeIndex}`, options)}
            </React.Fragment>
        ))
        : (block.text || '');

    switch (block.type) {
        case 'subheading':
            return <h4 key={key} className="post-rich-subheading">{inlineContent}</h4>;
        case 'quote':
            return (
                <blockquote className={`post-rich-quote post-rich-quote--${block.color || 'purple'}`}>
                    <div className="post-rich-quote-body">
                        {renderBlocks(block.blocks, `${key}-quote`, options)}
                    </div>
                </blockquote>
            );
        case 'divider':
            return <hr className="post-rich-divider" />;
        case 'bullet_list':
            return renderListWithOptions('ul', block, key, options);
        case 'ordered_list':
            return renderListWithOptions('ol', block, key, options);
        default:
            return <p className="post-rich-paragraph">{inlineContent}</p>;
    }
}

function renderListWithOptions(listTag, block, key, options) {
    const Tag = listTag;
    return (
        <Tag key={key} className={`post-rich-list ${listTag === 'ol' ? 'post-rich-list--ordered' : ''}`.trim()}>
            {(block.items || []).map((item, index) => (
                <li key={`${key}-item-${index}`}>
                    {Array.isArray(item)
                        ? item.map((child, childIndex) => (
                            <React.Fragment key={`${key}-item-${index}-${childIndex}`}>
                                {renderInlineNodeWithOptions(child, `${key}-item-${index}-${childIndex}`, options)}
                            </React.Fragment>
                        ))
                        : renderInlineNodeWithOptions(item, `${key}-item-${index}`, options)}
                </li>
            ))}
        </Tag>
    );
}

function renderInlineNodeWithOptions(node, keyPrefix, options) {
    if (typeof node === 'string') return node;
    if (!node || typeof node !== 'object') return null;

    if (node.type === 'emoji' && node.name && CUSTOM_EMOJI[node.name]) {
        const emoji = CUSTOM_EMOJI[node.name];
        const animateEmoji = Boolean(options?.animateEmoji);
        return (
            <span key={`${keyPrefix}-emoji`} className="post-rich-emoji">
                <TGSEmoji
                    name={node.name}
                    src={emoji.src}
                    type={emoji.type}
                    size={20}
                    animate={animateEmoji}
                    mountAnimation
                    fallbackMode="soft"
                    filename={emoji.filename}
                />
            </span>
        );
    }

    const content = Array.isArray(node.content)
        ? node.content.map((child, index) => (
            <React.Fragment key={`${keyPrefix}-${index}`}>
                {renderInlineNodeWithOptions(child, `${keyPrefix}-${index}`, options)}
            </React.Fragment>
        ))
        : (node.text || node.label || '');

    return wrapInlineMarks(node, content);
}
