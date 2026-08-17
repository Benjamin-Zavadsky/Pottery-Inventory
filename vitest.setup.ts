import '@testing-library/jest-dom';

// ||= (not ??=) — CI sets these to '' rather than leaving them unset when the
// repo secret isn't configured, and '' is falsy but not nullish.
process.env.NEXT_PUBLIC_SUPABASE_URL ||= 'https://test-project.supabase.co';
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||= 'test-anon-key';
process.env.ANTHROPIC_API_KEY ||= 'test-anthropic-key';
