/** The DSN from the SENTRY_DSN variable, or undefined when the variable is not a DSN. Its default value is "off". */
export function sentryDsn(env: Env): string | undefined {
  return env.SENTRY_DSN.startsWith("https://") ? env.SENTRY_DSN : undefined;
}
