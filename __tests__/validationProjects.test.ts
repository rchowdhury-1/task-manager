import { describe, it, expect } from 'vitest';
import { createProjectSchema, updateProjectSchema } from '@/lib/validation/projects';
import { createProjectUpdateSchema } from '@/lib/validation/projectUpdates';

describe('createProjectSchema', () => {
  it('accepts a minimal personal project, defaulting type/status', () => {
    const parsed = createProjectSchema.safeParse({ name: 'Side project' });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.type).toBe('personal');
      expect(parsed.data.status).toBe('active');
    }
  });

  it('accepts a client project with rate and currency', () => {
    const parsed = createProjectSchema.safeParse({
      name: 'Glass Gardens',
      type: 'client',
      client_name: 'Glass Gardens Aquatics',
      client_rate: 45,
      client_currency: 'GBP',
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const parsed = createProjectSchema.safeParse({ name: '' });
    expect(parsed.success).toBe(false);
  });

  it('rejects an unknown type', () => {
    const parsed = createProjectSchema.safeParse({ name: 'X', type: 'agency' });
    expect(parsed.success).toBe(false);
  });

  it('rejects an unknown status', () => {
    const parsed = createProjectSchema.safeParse({ name: 'X', status: 'cancelled' });
    expect(parsed.success).toBe(false);
  });

  it('rejects a currency code that is not 3 letters', () => {
    const parsed = createProjectSchema.safeParse({ name: 'X', client_currency: 'GB' });
    expect(parsed.success).toBe(false);
  });

  it('rejects a non-positive rate', () => {
    const parsed = createProjectSchema.safeParse({ name: 'X', client_rate: 0 });
    expect(parsed.success).toBe(false);
  });
});

describe('updateProjectSchema', () => {
  it('accepts a partial update with just a status change', () => {
    const parsed = updateProjectSchema.safeParse({ status: 'paused' });
    expect(parsed.success).toBe(true);
  });

  it('accepts an empty object (no-op update)', () => {
    const parsed = updateProjectSchema.safeParse({});
    expect(parsed.success).toBe(true);
  });
});

describe('createProjectUpdateSchema', () => {
  it('accepts a non-empty body', () => {
    const parsed = createProjectUpdateSchema.safeParse({ body: 'Shipped the auth flow.' });
    expect(parsed.success).toBe(true);
  });

  it('rejects an empty body', () => {
    const parsed = createProjectUpdateSchema.safeParse({ body: '' });
    expect(parsed.success).toBe(false);
  });

  it('rejects a body over 5000 characters', () => {
    const parsed = createProjectUpdateSchema.safeParse({ body: 'a'.repeat(5001) });
    expect(parsed.success).toBe(false);
  });
});
