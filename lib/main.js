"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const core = __importStar(require("@actions/core"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const stateHelper = __importStar(require("./state-helper"));
const tar = __importStar(require("tar"));
const child_process_1 = require("child_process");
const stream_1 = require("stream");
const util_1 = require("util");
const github_env_1 = require("./github-env");
const streamPipeline = (0, util_1.promisify)(stream_1.pipeline);
function resolveScripts(installerDir) {
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
    return {
        unwrap: localPaths[0],
        logs: localPaths[1],
        observables: localPaths[2],
    };
}
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const url = core.getInput("curiosity_archive_url");
            const curiosityHome = core.getInput("curiosity_home") || "/mnt/curiosity";
            const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curiosity-"));
            const setup = path.join(tmp, "curiosity-installer", "setup.sh");
            core.info(`Downloading curiosity archive`);
            const response = yield fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch curiosity archive: ${response.statusText}`);
            }
            core.info(`Unpacking curiosity archive to ${tmp}`);
            yield streamPipeline(response.body, tar.x({ cwd: tmp, gzip: true }));
            core.saveState("archivePath", tmp);
            core.saveState("curiosityHome", curiosityHome);
            core.info(`Setting up build observables via ${setup} (CURIOSITY_HOME=${curiosityHome})`);
            (0, child_process_1.execSync)(`bash ${setup}`, {
                stdio: "inherit",
                env: Object.assign(Object.assign({}, process.env), { CURIOSITY_HOME: curiosityHome }),
            });
        }
        catch (error) {
            // don't fail the build
            // FIXME we should have this be a param for internal vs not
            core.warning(`${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        }
    });
}
function cleanup() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            core.info(`Collecting build observable data...`);
            const archivePath = core.getState("archivePath");
            if (!archivePath) {
                throw new Error("Archive path not found in state. Was the setup step skipped?");
            }
            const curiosityHome = core.getState("curiosityHome") || "/mnt/curiosity";
            let scriptEnv = Object.assign(Object.assign({}, process.env), { CURIOSITY_HOME: curiosityHome });
            const installerDir = path.join(archivePath, "curiosity-installer");
            const scripts = resolveScripts(installerDir);
            (0, child_process_1.execSync)(`bash ${scripts.unwrap}`, { stdio: "inherit", env: scriptEnv });
            scriptEnv = (0, github_env_1.applyGithubEnv)(scriptEnv);
            (0, child_process_1.execSync)(`bash ${scripts.logs}`, { stdio: "inherit", env: scriptEnv });
            scriptEnv = (0, github_env_1.applyGithubEnv)(scriptEnv);
            (0, child_process_1.execSync)(`bash ${scripts.observables}`, {
                stdio: "inherit",
                env: scriptEnv,
            });
            scriptEnv = (0, github_env_1.applyGithubEnv)(scriptEnv);
            core.info(`Done emitting observables json - calling chalk env`);
            (0, child_process_1.execSync)(`chalk env`, { stdio: "inherit", env: scriptEnv });
            core.info(`Done`);
        }
        catch (error) {
            core.warning(`${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
        }
    });
}
// Main
if (!stateHelper.IsPost) {
    run();
}
// Post
else {
    cleanup();
}
