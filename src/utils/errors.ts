/**
 * Map terse API errors to actionable CLI messages.
 *
 * A bare "access denied" means the logged-in account can't read the requested
 * org/project — most often a mistyped or foreign --project-id/--org-id, since
 * the CLI passes explicit ids through without pre-validation.
 */
export function mapServerError(message: string): string {
  if (/^access denied\.?$/i.test(message.trim())) {
    return [
      "Access denied. The org/project id may be wrong, belong to a different",
      'organization, or your account may not have access. Run "stallion use"',
      "to pick a valid org and project, or verify --org-id/--project-id.",
    ].join(" ");
  }
  return message;
}
