import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';

// Mock Sentry before importing app
vi.mock('@sentry/node', () => ({
    default: {
        init: vi.fn(),
        setupExpressErrorHandler: vi.fn(),
        captureException: vi.fn(),
    },
}));

vi.mock('../src/config/sentry', () => ({
    initSentry: vi.fn(() => false),
}));

import { app } from '../src/app';

describe('Health Check', () => {
    it('should return 200 OK', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
    });
});
