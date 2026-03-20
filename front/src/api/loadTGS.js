import pako from 'pako';

const cache = new Map();

export async function loadTGS(url) {
    if (cache.has(url)) return cache.get(url);

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to load TGS: ${url}`);

    const buffer = await response.arrayBuffer();
    const json = pako.inflate(new Uint8Array(buffer), { to: 'string' });
    const data = JSON.parse(json);

    cache.set(url, data);
    return data;
}