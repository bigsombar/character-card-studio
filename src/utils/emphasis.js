/**
 * Removes paired emphasis markers from card prose.
 *
 * Only balanced runs of one to three asterisks are treated as markup. Literal asterisks,
 * multiplication, unclosed markers and markers padded with spaces are preserved. Each span is
 * handled independently so paragraphs and line breaks stay intact.
 *
 * @param {string} text
 * @returns {string}
 */
export default function removeEmphasisMarkup(text) {
    if (typeof text !== 'string' || text === '') return '';

    let output = '';
    let index = 0;

    while (index < text.length) {
        if (text[index] !== '*') {
            output += text[index];
            index += 1;
            continue;
        }

        let runLength = 1;
        while (runLength < 3 && text[index + runLength] === '*') runLength += 1;

        const contentStart = index + runLength;
        let closingIndex = -1;

        for (let cursor = contentStart + 1; cursor < text.length; cursor += 1) {
            if (text[cursor] === '\n') break;
            if (text[cursor] !== '*') continue;

            let closeRun = 1;
            while (closeRun < 3 && text[cursor + closeRun] === '*') closeRun += 1;

            if (closeRun === runLength) {
                const inner = text.slice(contentStart, cursor);
                if (inner !== '' && !/^\s|\s$/.test(inner)) {
                    closingIndex = cursor;
                    break;
                }
            }

            cursor += closeRun - 1;
        }

        if (closingIndex === -1) {
            output += text.slice(index, contentStart);
            index = contentStart;
            continue;
        }

        output += text.slice(contentStart, closingIndex);
        index = closingIndex + runLength;
    }

    return output;
}
