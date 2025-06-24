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

    core.info(`Setting up build observables via ${setup}`);
    execSync(`sh ${setup}`, { stdio: "inherit" });
  } catch (error) {
    core.setFailed(`${(error as any)?.message ?? error}`);
  }
}

async function cleanup(): Promise<void> {
  try {
    core.info(`Collecting build observable data...`);

    const scriptPath = path.join(
      __dirname,
      "../scripts/collect_observables.sh",
    );

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Post script not found at: ${scriptPath}`);
    }

    execSync(`bash ${scriptPath}`, { stdio: "inherit" });
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
