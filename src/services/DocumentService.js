/**
 * DocumentService – extracts usable content from uploaded files so it can be
 * injected into council model queries.
 *
 * Supported types:
 *   - Images (image/*):  base64 data URL → sent as image_url content block to vision models
 *   - PDFs (application/pdf): text extracted via pdf.js loaded from CDN
 *   - Plain text (text/*): read as UTF-8 text
 *
 * Returns an array of attachment objects:
 *   { name, type: 'image'|'text', content, mimeType, size }
 */

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfjsLib = null;

async function loadPdfJs() {
    if (pdfjsLib) return pdfjsLib;
    if (window.pdfjsLib) {
        pdfjsLib = window.pdfjsLib;
        return pdfjsLib;
    }
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = PDFJS_CDN;
        script.onload = () => {
            window.pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
            pdfjsLib = window.pdfjsLib;
            resolve(pdfjsLib);
        };
        script.onerror = () => reject(new Error('Failed to load pdf.js from CDN'));
        document.head.appendChild(script);
    });
}

/**
 * Read a File as a base64 data URL.
 */
function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Read a File as text.
 */
function fileToText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

/**
 * Extract text from a PDF File using pdf.js.
 */
async function extractPdfText(file) {
    const pdfjs = await loadPdfJs();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;

    const textParts = [];
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        textParts.push(`[Page ${pageNum}]\n${pageText}`);
    }
    return textParts.join('\n\n');
}

/**
 * Process a single File into an attachment object.
 */
export async function processFile(file) {
    const mimeType = file.type;
    const name = file.name;
    const size = file.size;

    if (mimeType.startsWith('image/')) {
        const content = await fileToDataURL(file);
        return { name, type: 'image', content, mimeType, size };
    }

    if (mimeType === 'application/pdf') {
        try {
            const content = await extractPdfText(file);
            return { name, type: 'text', content, mimeType, size };
        } catch (err) {
            console.error('PDF extraction failed:', err);
            return {
                name,
                type: 'text',
                content: `[PDF extraction failed for "${name}". The file could not be parsed.]`,
                mimeType,
                size,
            };
        }
    }

    if (mimeType.startsWith('text/') || mimeType === 'application/json') {
        const content = await fileToText(file);
        return { name, type: 'text', content, mimeType, size };
    }

    // Fallback: treat as text but warn
    return {
        name,
        type: 'text',
        content: `[Unsupported file type "${mimeType}" for "${name}". Content not extracted.]`,
        mimeType,
        size,
    };
}

/**
 * Process multiple files in parallel.
 */
export async function processFiles(files) {
    return Promise.all(Array.from(files).map(processFile));
}

/**
 * Build the messages array for a given user query + attachments,
 * in OpenAI-compatible format understood by OpenRouter.
 *
 * - Text/PDF attachments are prepended as context to the text content.
 * - Image attachments are added as image_url content blocks.
 *   (Models that don't support vision will gracefully degrade.)
 *
 * @param {string} userQuery
 * @param {Array}  attachments – array from processFiles()
 * @param {Array}  conversationHistory – prior messages for multi-turn [{role, content}]
 * @returns {Array} OpenAI-format messages array
 */
export function buildMessages(userQuery, attachments = [], conversationHistory = []) {
    // Prepend text-based attachment content
    const textAttachments = attachments.filter(a => a.type === 'text');
    const imageAttachments = attachments.filter(a => a.type === 'image');

    let textPrefix = '';
    if (textAttachments.length > 0) {
        textPrefix = textAttachments.map(a =>
            `[Attached document: ${a.name}]\n${a.content}`
        ).join('\n\n---\n\n') + '\n\n---\n\n';
    }

    const fullText = textPrefix + userQuery;

    // Build the content for the current user message
    let userContent;
    if (imageAttachments.length > 0) {
        // Multi-modal content block
        userContent = [
            { type: 'text', text: fullText },
            ...imageAttachments.map(a => ({
                type: 'image_url',
                image_url: { url: a.content },
            })),
        ];
    } else {
        userContent = fullText;
    }

    // Build full history + current message
    const messages = [
        ...conversationHistory,
        { role: 'user', content: userContent },
    ];

    return messages;
}
