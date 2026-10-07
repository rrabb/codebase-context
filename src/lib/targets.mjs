// Which agent tools a project installs guidance for, and where each tool reads skills.
export const TARGETS = ['copilot', 'claude', 'codex'];
export const DEFAULT_TARGETS = ['copilot'];

// Copilot reads .github/skills, .claude/skills and .agents/skills; Claude Code reads only .claude/skills;
// Codex reads only .agents/skills. Use the fewest folders so Copilot does not list a skill twice.
export function skillDirsFor (targets) {
  const dirs = [];
  targets.includes('claude') && dirs.push('.claude/skills');
  targets.includes('codex') && dirs.push('.agents/skills');
  dirs.length || dirs.push('.github/skills');
  return dirs;
}

export function resolveTargets (config, cliValue) {
  const raw = cliValue ? cliValue.split(',') : (config.targets ?? DEFAULT_TARGETS);
  const targets = [...new Set(raw.map((t) => String(t).trim().toLowerCase()).filter(Boolean))];
  const unknown = targets.filter((t) => !TARGETS.includes(t));
  if (unknown.length || !targets.length)
    throw new Error(`Unknown or empty targets: ${unknown.join(', ') || '(none)'}. Use any of: ${TARGETS.join(', ')}.`);
  return targets;
}
