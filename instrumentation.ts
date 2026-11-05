/**
 * Next.js instrumentation hook — runs once at server startup.
 * Validates critical environment variables and fails fast in production.
 */

const REQUIRED_ENVS: { key: string; hint: string }[] = [
  { key: 'NEXT_PUBLIC_SUPABASE_URL', hint: 'Supabase project URL' },
  { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', hint: 'Supabase anon key' },
  { key: 'SUPABASE_SERVICE_ROLE_KEY', hint: 'Supabase service role key (server-only)' },
  { key: 'TOSS_SECRET_KEY', hint: 'Toss Payments secret key' },
  { key: 'ADMIN_API_KEY', hint: 'Admin API key for /api/admin/** routes' },
  { key: 'NEXT_PUBLIC_APP_URL', hint: 'Public app URL (e.g. https://globalmatch.app)' },
]

const PLACEHOLDER_PATTERNS = ['your-', 'placeholder', 'change-me', 'test_sk_', 'test_ck_']

function isPlaceholder(value: string): boolean {
  return PLACEHOLDER_PATTERNS.some((p) => value.includes(p))
}

export async function register() {
  if (process.env.NEXT_RUNTIME === 'edge') return

  const missing: string[] = []
  const placeholder: string[] = []

  for (const { key, hint } of REQUIRED_ENVS) {
    const value = process.env[key]
    if (!value) {
      missing.push(`  ✗ ${key} — ${hint}`)
    } else if (isPlaceholder(value)) {
      placeholder.push(`  ⚠ ${key} — appears to be a placeholder value`)
    }
  }

  if (missing.length > 0) {
    const msg = `\n[GlobalMatch] STARTUP ERROR — Missing required environment variables:\n${missing.join('\n')}\n\nSet them in .env.local or your deployment environment.\n`
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg)
    } else {
      console.error(msg)
    }
  }

  if (placeholder.length > 0 && process.env.NODE_ENV === 'production') {
    const msg = `\n[GlobalMatch] STARTUP WARNING — Placeholder env values detected in production:\n${placeholder.join('\n')}\n`
    console.warn(msg)
  }
}
