import { describe, it, expect, vi } from 'vitest';
import { createPostHogAdapter } from './posthog.js';
import type { PostHogLike } from './posthog.js';

function createMockPostHog() {
  return {
    opt_in_capturing: vi.fn<PostHogLike['opt_in_capturing']>(),
    opt_out_capturing: vi.fn<PostHogLike['opt_out_capturing']>(),
    has_opted_in_capturing: vi.fn<PostHogLike['has_opted_in_capturing']>().mockReturnValue(false),
    has_opted_out_capturing: vi.fn<PostHogLike['has_opted_out_capturing']>().mockReturnValue(false),
  };
}

describe('PostHog Adapter', () => {
  it('creates adapter with default id and category', () => {
    const posthog = createMockPostHog();
    const adapter = createPostHogAdapter(posthog);

    expect(adapter.id).toBe('posthog');
    expect(adapter.category).toBe('analytics');
  });

  it('creates adapter with custom id and category', () => {
    const posthog = createMockPostHog();
    const adapter = createPostHogAdapter(posthog, {
      id: 'my-posthog',
      category: 'marketing',
    });

    expect(adapter.id).toBe('my-posthog');
    expect(adapter.category).toBe('marketing');
  });

  it('calls opt_in_capturing on consent', () => {
    const posthog = createMockPostHog();
    const adapter = createPostHogAdapter(posthog);

    adapter.onConsent();
    expect(posthog.opt_in_capturing).toHaveBeenCalledOnce();
  });

  it('does not call opt_in_capturing if already opted in', () => {
    const posthog = createMockPostHog();
    posthog.has_opted_in_capturing.mockReturnValue(true);
    const adapter = createPostHogAdapter(posthog);

    adapter.onConsent();
    expect(posthog.opt_in_capturing).not.toHaveBeenCalled();
  });

  it('calls opt_out_capturing on revoke', () => {
    const posthog = createMockPostHog();
    const adapter = createPostHogAdapter(posthog);

    adapter.onRevoke();
    expect(posthog.opt_out_capturing).toHaveBeenCalledOnce();
  });

  it('does not call opt_out_capturing if already opted out', () => {
    const posthog = createMockPostHog();
    posthog.has_opted_out_capturing.mockReturnValue(true);
    const adapter = createPostHogAdapter(posthog);

    adapter.onRevoke();
    expect(posthog.opt_out_capturing).not.toHaveBeenCalled();
  });
});
