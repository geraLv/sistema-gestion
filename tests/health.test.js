"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
// Mock Sentry before importing app
vitest_1.vi.mock('@sentry/node', () => ({
    default: {
        init: vitest_1.vi.fn(),
        setupExpressErrorHandler: vitest_1.vi.fn(),
        captureException: vitest_1.vi.fn(),
    },
}));
vitest_1.vi.mock('../src/config/sentry', () => ({
    initSentry: vitest_1.vi.fn(() => false),
}));
const app_1 = require("../src/app");
(0, vitest_1.describe)('Health Check', () => {
    (0, vitest_1.it)('should return 200 OK', async () => {
        const response = await (0, supertest_1.default)(app_1.app).get('/health');
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body).toHaveProperty('status', 'ok');
    });
});
