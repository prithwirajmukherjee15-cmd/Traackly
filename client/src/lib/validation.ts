import { z } from 'zod';

// These schemas mirror the server's domain validation (internal/domain/validate.go)
// so the client blocks invalid submits with the same messages; the server re-validates.

export const requestSchema = z.object({
  clientName: z
    .string()
    .trim()
    .min(1, 'Client name is required')
    .min(2, 'Client name must be 2–200 characters')
    .max(200, 'Client name must be 2–200 characters'),
  requirementDetails: z
    .string()
    .trim()
    .min(1, 'Requirement details are required')
    .max(5000, 'Requirement details must be 5000 characters or fewer'),
  targetDepartment: z.enum(['production', 'supply', 'qa'], {
    errorMap: () => ({ message: 'Select a target department' }),
  }),
  priority: z.enum(['normal', 'urgent']),
});

export const passwordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Use at least 8 characters, including a number')
      .regex(/\d/, 'Use at least 8 characters, including a number'),
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const emailSchema = z.string().trim().email('Enter a valid email address');

export const inviteSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be 2–100 characters').max(100, 'Name must be 2–100 characters'),
    email: emailSchema,
    role: z.enum(['coordinator', 'authorizer', 'logistics', 'floor_supervisor'], {
      errorMap: () => ({ message: 'Choose a role' }),
    }),
    department: z.string(),
  })
  .refine((v) => v.role !== 'floor_supervisor' || ['production', 'supply', 'qa'].includes(v.department), {
    message: 'Floor supervisors need a department',
    path: ['department'],
  });

/** Flattens a zod result into a field → first message map. */
export function fieldErrors<T>(result: z.SafeParseReturnType<T, T>): Record<string, string> {
  if (result.success) return {};
  const out: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? 'form');
    out[key] ??= issue.message;
  }
  return out;
}
