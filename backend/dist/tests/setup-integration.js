"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient({
    datasources: {
        db: {
            url: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
        }
    }
});
exports.prisma = prisma;
afterAll(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=setup-integration.js.map