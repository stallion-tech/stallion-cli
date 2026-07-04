/**
 * Map terse API errors to actionable CLI messages.
 *
 * A bare "access denied" means the logged-in account can't read the requested
 * org/project — most often a mistyped or foreign --project-id/--org-id, since
 * the CLI passes explicit ids through without pre-validation.
 */
export function mapServerError(message: string): string {
  if (/^access denied\.?$/i.test(message.trim())) {
    return 'Access denied. Check --org-id/--project-id, or run "stallion use".';
  }
  // The regional API doesn't host this project — usually a wrong or foreign
  // --project-id.
  if (/project not found in this region/i.test(message)) {
    return 'Project not found. Check --project-id, or run "stallion use".';
  }
  return message;
}
