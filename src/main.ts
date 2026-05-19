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

async function run(): Promise<void> {
  try {
    const url: string = core.getInput("curiosity_archive_url");
    const curiosityHome: string = core.getInput("curiosity_home") || "/mnt/curiosity";
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

    core.info(`Setting up build observables via ${setup} (CURIOSITY_HOME=${curiosityHome})`);
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
      throw new Error("Archive path not found in state. Was the setup step skipped?");
    }

    const curiosityHome = core.getState("curiosityHome") || "/mnt/curiosity";
    const scriptEnv = { ...process.env, CURIOSITY_HOME: curiosityHome };

    const installerDir = path.join(archivePath, "curiosity-installer");
    const scriptPath = path.join(installerDir, "collect_observables.sh");
    const logsScriptPath = path.join(installerDir, "collect_curiosity_logs.sh");
    const unwrapScriptPath = path.join(installerDir, "unwrap.sh");

    if (!fs.existsSync(unwrapScriptPath)) {
      throw new Error(`Unwrap script not found at: ${unwrapScriptPath}`);
    }
    if (!fs.existsSync(logsScriptPath)) {
      throw new Error(`Logs script not found at: ${logsScriptPath}`);
    }
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Observables script not found at: ${scriptPath}`);
    }

    execSync(`bash ${unwrapScriptPath}`, { stdio: "inherit", env: scriptEnv });
    execSync(`bash ${logsScriptPath}`, { stdio: "inherit", env: scriptEnv });
    execSync(`bash ${scriptPath}`, { stdio: "inherit", env: scriptEnv });

    core.info(`Done emitting observables json - calling chalk env`);
    execSync(`chalk env`, { stdio: "inherit" });
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
