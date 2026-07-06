/** Map terse API errors to actionable CLI messages. */
export function mapServerError(message: string): string {
  if (/^access denied\.?$/i.test(message.trim())) {
    return 'Access denied. Check --org-id/--project-id, or run "stallion use".';
  }
  if (/project not found in this region/i.test(message)) {
    return 'Project not found. Check --project-id, or run "stallion use".';
  }
  return message;
}
