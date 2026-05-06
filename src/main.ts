import * as core from "@actions/core";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as stateHelper from "./state-helper";
import * as tar from "tar";
import { execSync } from "child_process";
import { pipeline } from "stream";
import { promisify } from "util";

const streamPipeline = promisify(pipeline);

function resolveScripts(installerDir: string): {
  unwrap: string;
  logs: string;
  observables: string;
} {
  const names = [
    "unwrap.sh",
    "collect_curiosity_logs.sh",
    "collect_observables.sh",
  ];
  const archivePaths = names.map((n) => path.join(installerDir, n));
  const bundleComplete = archivePaths.every((p) => fs.existsSync(p));

  if (bundleComplete) {
    return {
      unwrap: archivePaths[0],
      logs: archivePaths[1],
      observables: archivePaths[2],
    };
  }

  core.info("Bundle incomplete, using local scripts/ fallback for all");
  const localDir = path.join(__dirname, "../scripts");
  const localPaths = names.map((n) => path.join(localDir, n));
  const allLocal = localPaths.every((p) => fs.existsSync(p));
  if (!allLocal) {
    throw new Error("Scripts missing from both archive and local scripts/");
  }
  return { unwrap: localPaths[0], logs: localPaths[1], observables: localPaths[2] };
}

// Mirror what the GitHub runner does between steps: fold $GITHUB_ENV writes
// (KEY=VALUE and KEY<<heredoc forms, last value wins) into an env object so a
// script's env changes are visible to the scripts that run after it within the
// same step.
function applyGithubEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const file = env.GITHUB_ENV;
  if (!file || !fs.existsSync(file)) {
    return env;
  }
  const merged = { ...env };
  const lines = fs.readFileSync(file, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const heredoc = line.match(/^([^=<]+)<<(.+)$/);
    if (heredoc) {
      const [, key, delim] = heredoc;
      const buf: string[] = [];
      while (++i < lines.length && lines[i] !== delim) {
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

async function run(): Promise<void> {
  try {
    const url: string = core.getInput("curiosity_archive_url");
    const curiosityHome: string =
      core.getInput("curiosity_home") || "/mnt/curiosity";
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curiosity-"));
    const setup = path.join(tmp, "curiosity-installer", "setup.sh");

    core.info(`Downloading curiosity archive`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch curiosity archive: ${response.statusText}`,
      );
    }

    core.info(`Unpacking curiosity archive to ${tmp}`);
    await streamPipeline(response.body!, tar.x({ cwd: tmp, gzip: true }));

    core.saveState("archivePath", tmp);
    core.saveState("curiosityHome", curiosityHome);

    core.info(
      `Setting up build observables via ${setup} (CURIOSITY_HOME=${curiosityHome})`,
    );
    execSync(`bash ${setup}`, {
      stdio: "inherit",
      env: { ...process.env, CURIOSITY_HOME: curiosityHome },
    });
  } catch (error) {
    // don't fail the build
    // FIXME we should have this be a param for internal vs not
    core.warning(`${(error as any)?.message ?? error}`);
  }
}

async function cleanup(): Promise<void> {
  try {
    core.info(`Collecting build observable data...`);

    const archivePath = core.getState("archivePath");
    if (!archivePath) {
      throw new Error(
        "Archive path not found in state. Was the setup step skipped?",
      );
    }

    const curiosityHome = core.getState("curiosityHome") || "/mnt/curiosity";
    let scriptEnv: NodeJS.ProcessEnv = {
      ...process.env,
      CURIOSITY_HOME: curiosityHome,
    };
    const installerDir = path.join(archivePath, "curiosity-installer");

    const scripts = resolveScripts(installerDir);

    execSync(`bash ${scripts.unwrap}`, { stdio: "inherit", env: scriptEnv });
    scriptEnv = applyGithubEnv(scriptEnv);
    execSync(`bash ${scripts.logs}`, { stdio: "inherit", env: scriptEnv });
    scriptEnv = applyGithubEnv(scriptEnv);
    execSync(`bash ${scripts.observables}`, { stdio: "inherit", env: scriptEnv });
    scriptEnv = applyGithubEnv(scriptEnv);

    core.info(`Done emitting observables json - calling chalk env`);
    execSync(`chalk env`, { stdio: "inherit", env: scriptEnv });
    core.info(`Done`);
  } catch (error) {
    core.warning(`${(error as any)?.message ?? error}`);
  }
}

// Main
if (!stateHelper.IsPost) {
  run();
}
// Post
else {
  cleanup();
}
