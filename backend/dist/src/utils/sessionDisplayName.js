"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatSessionDisplayName = formatSessionDisplayName;
function formatSessionDisplayName(date) {
    const formatted = date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
    return `Interview Practice - ${formatted}`;
}
//# sourceMappingURL=sessionDisplayName.js.map