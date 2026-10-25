import fs from "fs";
import { readFile } from 'node:fs/promises';
import path from "path";
import { fileURLToPath } from "url";
import { isAxiosError } from "axios";
import type { Embedding } from "ai";
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

export type Chunk = {
    context: string,
    text: string;
    page: number;
}

export const computeAbsolutePath = (fileDirName: string) => {
    const __dirname = path.dirname(fileURLToPath(import.meta.url));
    const coolPath = path.join(__dirname, fileDirName);
    return coolPath;
}

export const mreadFile = async (
    filePath: string | undefined,
): Promise<string> => {
    if (!filePath) throw new Error("File path is undefined");

    let result: string = "";
    const coolPath = computeAbsolutePath(filePath);
    const readStream = fs.createReadStream(coolPath);
    try {
        for await (const chunk of readStream) {
            result += chunk;
        }
        return result;
    } catch (error) {
        throw error;
    } finally {
        readStream.close();
    }
};

export const writeFile = async (
    filePath: string | undefined,
    line: string,
): Promise<void> => {
    if (!filePath) throw new Error("File path is undefined");

    const coolPath = computeAbsolutePath(filePath);
    const writeStream = fs.createWriteStream(coolPath, { flags: "a" });
    writeStream.write(line, (error) => {
        console.log(error);
        writeStream.close();
    });
};

export const readFileSync = (
    absoluteFilePath: string | undefined,
): string => {
    if (!absoluteFilePath) throw new Error("File path is undefined");
    return fs.readFileSync(absoluteFilePath, { encoding: 'utf8', flag: 'r' });
}

export const writeEmbeddings = (directory: string, embeddings: Embedding[]) => {
    const D = embeddings[0].length;
    const flat = new Float32Array(embeddings.length * D);
    embeddings.forEach((v, i) => flat.set(v, i * D));
    fs.writeFileSync(
        path.resolve(path.join(directory, "emb.f32")),
        Buffer.from(flat.buffer),
    );
    fs.writeFileSync(
        path.resolve(path.join(directory, "emb.meta.json")),
        JSON.stringify({ n: embeddings.length, dim: D }),
    );
};

export const loadEmbeddings = (directory: string): Embedding[] => {
    const { n, dim } = JSON.parse(
        fs.readFileSync(
            path.resolve(path.join(directory, "emb.meta.json")),
            "utf8"
        )) as {
            n: number;
            dim: number;
        };

    const buf = fs.readFileSync(path.resolve(path.join(directory, "emb.f32")));
    const arr = new Float32Array(
        buf.buffer,
        buf.byteOffset,
        buf.byteLength / 4,
    );

    const embeddings: Embedding[] = [];
    for (let i = 0; i < n; i++) {
        embeddings.push(Array.from(arr.subarray(i * dim, (i + 1) * dim)));
    }
    return embeddings;
}

export const toErrorMessage = (err: unknown): string => {
    if (isAxiosError(err)) {
        const status = err.response?.status;
        const body = err.response?.data;
        const detail =
            body === undefined
                ? err.message
                : typeof body === "string"
                  ? body
                  : JSON.stringify(body);
        return `CMS request failed${status ? ` (HTTP ${status})` : ""}: ${detail}`.slice(
            0,
            2000,
        );
    }
    if (err instanceof Error) return err.message;
    if (typeof err === "string") return err;
    try {
        return JSON.stringify(err);
    } catch {
        return String(err);
    }
};

const CHUNK_DIM = 300;      // parole target per chunk
const OVERLAP = 0.2;        // frazione di overlap
const MIN_CHUNK_WORDS = 15; // sotto questa soglia il chunk viene fuso col vicino

const countWords = (s: string) => s.split(/\s+/).filter(Boolean).length;

/**
 * Split in frasi. Evita di spezzare su abbreviazioni, numeri decimali, "e.g." ecc.
 * Se disponibile, Intl.Segmenter è più robusto di una regex.
 */
const splitSentences = (text: string, locale = 'en'): string[] => {
    const normalized = text.replace(/\s+/g, ' ').trim();
    if (!normalized) return [];

    const segmenter = new Intl.Segmenter(locale, { granularity: 'sentence' });
    return Array.from(segmenter.segment(normalized), s => s.segment.trim()).filter(Boolean);
};

/**
 * Se una "frase" è più lunga del budget (pseudocodice, tabelle, elenchi),
 * la spezzo a parole in pezzi di dimensione massima maxWords.
 */
const splitLongSentence = (sentence: string, maxWords: number): string[] => {
    const words = sentence.split(/\s+/).filter(Boolean);
    if (words.length <= maxWords) return [sentence];

    const parts: string[] = [];
    for (let i = 0; i < words.length; i += maxWords) {
        parts.push(words.slice(i, i + maxWords).join(' '));
    }
    return parts;
};

const retrieveChunks = (
    text: string,
    maxWords: number,
    page: number,
    context?: string,
    overlap = 0.1,
): Chunk[] => {
    const sentences = splitSentences(text).flatMap(s => splitLongSentence(s, maxWords));
    const overlapWords = Math.floor(maxWords * overlap);

    const chunks: string[][] = []; // ogni chunk è una lista di frasi
    let current: string[] = [];
    let currentWords = 0;

    for (const sentence of sentences) {
        const w = countWords(sentence);

        if (currentWords + w > maxWords && current.length > 0) {
            chunks.push(current);

            // overlap: riparto dalle ultime frasi che stanno nel budget di overlap
            const carry: string[] = [];
            let carryWords = 0;
            for (let i = current.length - 1; i >= 0; i--) {
                const cw = countWords(current[i]);
                if (carryWords + cw > overlapWords) break;
                carry.unshift(current[i]);
                carryWords += cw;
            }
            current = carry;
            currentWords = carryWords;
        }

        current.push(sentence);
        currentWords += w;
    }
    if (current.length > 0) chunks.push(current);

    // Fondo i chunk troppo piccoli (es. ultimo chunk di una pagina) col precedente
    const merged: string[][] = [];
    for (const c of chunks) {
        const size = countWords(c.join(' '));
        if (size < MIN_CHUNK_WORDS && merged.length > 0) {
            merged[merged.length - 1].push(...c);
        } else {
            merged.push(c);
        }
    }

    return merged.map(c => ({ text: c.join(' '), page, context: context || '' }));
};

const titleFromFirstPage = async (doc: pdfjs.PDFDocumentProxy): Promise<string | undefined> => {
    const page = await doc.getPage(1);
    const { items } = await page.getTextContent();

    const texts = items.filter((it: any) => it.str.trim()) as any[];
    if (!texts.length) return undefined;

    const maxSize = Math.max(...texts.map(it => it.height));

    // prendo gli item con dimensione ~ massima (tolleranza per arrotondamenti)
    const titleItems = texts.filter(it => it.height >= maxSize * 0.97);

    return titleItems
        .map(it => it.str + (it.hasEOL ? ' ' : ''))
        .join('')
        .replace(/\s+/g, ' ')
        .trim() || undefined;
};

const looksLikeJunk = (t: string) =>
    t.length < 5 ||
    /\.(docx?|tex|dvi|pdf|indd)$/i.test(t) ||
    /^(microsoft word|untitled|document)/i.test(t);

export const readPdf = async (filePath: string): Promise<Chunk[][]> => {
    let title = undefined;
    const data = new Uint8Array(await readFile(filePath));
    const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
    const { info, metadata } = await doc.getMetadata();
    const meta = ((metadata?.get('dc:title') as string) ?? (info as any)?.Title ?? '').trim();

    if (meta && !looksLikeJunk(meta)) {
        title = meta;
    } else {
        title = await titleFromFirstPage(doc);
    }

    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();

        const text = content.items
            .map((it: any) => ('str' in it ? it.str + (it.hasEOL ? '\n' : '') : ''))
            .join('')
            .normalize('NFKC'); // risolve ligature: ﬁ -> fi

        pages.push(text);
    }

    return pages.map((p, i) => retrieveChunks(p ?? '', CHUNK_DIM, i + 1, title, OVERLAP));
}

const convertChunksToJson = (filePath: string, chunksPerPage: Chunk[][]) => {
    const result: any = [];
    for(const page of chunksPerPage) {
        for(const chunk of page) {
            result.push(chunk);
        }
    }
    writeFile(filePath, JSON.stringify(result));
}

export const convertAllFilesInDir = (dirPathPaper: string, dirPathJson: string) => {
    fs.readdirSync(dirPathPaper).forEach(async file => {
        const fileNameParts = file.split('.').map((part) => {
            if(part === 'pdf') return 'json';
            return part;
        });
        const fileNameJson = fileNameParts.join('.');
        try {
            const chunksPerPage = await readPdf(path.join(dirPathPaper, file))
            convertChunksToJson(path.join(dirPathJson, fileNameJson), chunksPerPage);
        } catch(err) {
            console.error(err);
        }
    });
}


/*
export const readPdf = (filePath: string): Promise<Chunk[][]> => {

    const CHUNK_DIM = 300;
    const OVERLAP = 0.2;

    const retrieveChunks = (text: string, words: number, page: number, overlap = 0.1) => {
        const slidingWindow = (1 - overlap) * words; // 90% sliding window, 10% di overlap
        const tolerance = 20; // number of extra words per chunks to complete/stop the sentence
        const chunks: Chunk[] = [];

        const wordList = text.split(' ');
        let index = 0;

        while(index < wordList.length ){
            const currentChunk = wordList.slice(index, index + words);
            let positionOflastWordOfSentenceInChunk = 0;
            currentChunk.forEach((word, index) => {
                if(word.includes('.')) {
                    positionOflastWordOfSentenceInChunk = index;
                }
            })
            const delta = currentChunk.length - currentChunk.slice(0, positionOflastWordOfSentenceInChunk + 1).length;
            if (delta > tolerance) {
                chunks.push({ 
                    text: currentChunk.slice(0, positionOflastWordOfSentenceInChunk + 1).join(' '),
                    page,
                });
            } else {
                chunks.push({ 
                    text: currentChunk.join(' '),
                    page,
                }); 
            }

            // now do the same for the sliding window adaptation
            index += slidingWindow;
            const chunkInSlidingWindow = currentChunk.slice(0, slidingWindow);
            let positionOflastWordOfSentenceInChunkSlidingWindow = 0;
            chunkInSlidingWindow.forEach((word, id) => {
                if(word.includes('.')) {
                    positionOflastWordOfSentenceInChunkSlidingWindow = id;
                }
            })

            const deltaInSlidingWindow = chunkInSlidingWindow.length - chunkInSlidingWindow.slice(0, positionOflastWordOfSentenceInChunkSlidingWindow + 1).length;
            if (deltaInSlidingWindow > tolerance) {
                index -= deltaInSlidingWindow;
            }
        }

        return chunks;
    } 

    return new Promise((resolve, reject) => {
        const pages: string[] = [];
        let current = -1;

        new PdfReader().parseFileItems(filePath, (err, item) => {
            if (err) reject(err);
            else if (!item) resolve(pages.map((page, index) => retrieveChunks(page, CHUNK_DIM, index, OVERLAP)));
            else if (item.page) { current = item.page - 1; pages[current] = ''; }
            else if (item.text) pages[current] += item.text + ' ';
        });
    });
}
    */