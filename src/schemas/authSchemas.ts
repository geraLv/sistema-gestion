import { z } from 'zod';

export const loginSchema = z.object({
    body: z.object({
        usuario: z.string().min(1, 'Usuario is required'),
        password: z.string().min(1, 'Password is required'),
    }),
});

export const changePasswordSchema = z.object({
    body: z.object({
        usuario: z.string().min(1, 'Usuario is required'),
        passwordActual: z.string().min(1, 'Current password is required'),
        passwordNueva: z.string().min(6, 'New password must be at least 6 characters'),
    }),
});

export const validateTokenSchema = z.object({
    body: z.object({
        token: z.string().optional(),
    }),
});
