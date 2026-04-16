"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeOpenAiTransportError = serializeOpenAiTransportError;
exports.whisperFailureSummary = whisperFailureSummary;
function serializeOpenAiTransportError(error) {
    const chain = [];
    let current = error;
    const maxHops = 8;
    const isDev = process.env.NODE_ENV === 'development';
    for (let i = 0; i < maxHops && current != null; i++) {
        if (current instanceof Error) {
            const any = current;
            const link = {
                name: current.name,
                message: current.message
            };
            if (any.code != null)
                link.code = any.code;
            if (any.errno != null)
                link.errno = any.errno;
            if (any.syscall != null)
                link.syscall = any.syscall;
            if (any.address != null)
                link.address = any.address;
            if (any.port != null)
                link.port = any.port;
            if (any.status != null)
                link.httpStatus = any.status;
            if (any.statusCode != null)
                link.statusCode = any.statusCode;
            if (typeof any.type === 'string')
                link.openaiType = any.type;
            if (typeof any.param === 'string')
                link.openaiParam = any.param;
            if (any.error != null && typeof any.error === 'object') {
                try {
                    link.openaiErrorBody = JSON.stringify(any.error).slice(0, 2000);
                }
                catch {
                    link.openaiErrorBody = String(any.error);
                }
            }
            if (any.response != null && typeof any.response === 'object') {
                const r = any.response;
                if (r.status != null)
                    link.responseStatus = r.status;
                if (r.data != null && typeof r.data === 'object') {
                    try {
                        link.responseDataSnippet = JSON.stringify(r.data).slice(0, 1500);
                    }
                    catch {
                    }
                }
            }
            if (isDev && current.stack) {
                link.stackHead = current.stack.split('\n').slice(0, 14).join('\n');
            }
            chain.push(link);
            current = any.cause;
        }
        else if (typeof current === 'object') {
            try {
                chain.push({ nonErrorObject: JSON.stringify(current).slice(0, 800) });
            }
            catch {
                chain.push({ nonErrorObject: '[object]' });
            }
            break;
        }
        else {
            chain.push({ value: String(current) });
            break;
        }
    }
    return { chain };
}
function whisperFailureSummary(error) {
    const { chain } = serializeOpenAiTransportError(error);
    if (chain.length === 0)
        return 'unknown error';
    const pick = [...chain].reverse().find((link) => {
        const code = link.code != null ? String(link.code) : '';
        const name = typeof link.name === 'string' ? link.name : '';
        return (code === 'ECONNRESET' ||
            code === 'ETIMEDOUT' ||
            code === 'ECONNREFUSED' ||
            code === 'ENOTFOUND' ||
            name === 'FetchError');
    }) ?? chain[0];
    const parts = [];
    if (typeof pick.message === 'string')
        parts.push(pick.message);
    if (pick.code != null)
        parts.push(`code=${String(pick.code)}`);
    if (pick.httpStatus != null)
        parts.push(`http=${String(pick.httpStatus)}`);
    else if (pick.statusCode != null)
        parts.push(`http=${String(pick.statusCode)}`);
    if (pick.responseStatus != null)
        parts.push(`responseStatus=${String(pick.responseStatus)}`);
    if (typeof pick.syscall === 'string')
        parts.push(`syscall=${pick.syscall}`);
    if (typeof pick.address === 'string')
        parts.push(`address=${pick.address}`);
    return parts.join(' | ').slice(0, 450);
}
//# sourceMappingURL=openAiTransportErrorDetail.js.map