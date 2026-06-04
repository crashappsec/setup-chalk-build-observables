import * as fs from "fs";

export interface GithubEnvHeredocHeader {
  key: string;
  delimiter: string;
}

export function parseGithubEnvHeredocHeader(
  line: string,
): GithubEnvHeredocHeader | undefined {
  const heredocMarker = "<<";
  const markerIndex = line.indexOf(heredocMarker);
  if (markerIndex <= 0) {
    return undefined;
  }

  const key = line.slice(0, markerIndex);
  const delimiter = line.slice(markerIndex + heredocMarker.length);
  if (!delimiter || key.includes("=") || key.includes("<")) {
    return undefined;
  }

  return { key, delimiter };
}

// Mirror what the GitHub runner does between steps: fold $GITHUB_ENV writes
// (KEY=VALUE and KEY<<heredoc forms, last value wins) into an env object so a
// script's env changes are visible to the scripts that run after it within the
// same step.
export function applyGithubEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const file = env.GITHUB_ENV;
  if (!file || !fs.existsSync(file)) {
    return env;
  }
  const merged = { ...env };
  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heredoc = parseGithubEnvHeredocHeader(line);
    if (heredoc) {
      const { key, delimiter } = heredoc;
      const buf: string[] = [];
      while (++i < lines.length && lines[i] !== delimiter) {
        buf.push(lines[i]);
      }
      merged[key] = buf.join("\n");
      continue;
    }
    const eq = line.indexOf("=");
    if (eq > 0) {
      merged[line.slice(0, eq)] = line.slice(eq + 1);
    }
  }
  return merged;
}
