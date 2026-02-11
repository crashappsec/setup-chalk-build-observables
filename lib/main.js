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
const streamPipeline = (0, util_1.promisify)(stream_1.pipeline);
function run() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            const url = core.getInput("curiosity_archive_url");
            const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "curiosity-"));
            const setup = path.join(tmp, "curiosity-installer", "setup.sh");
            core.info(`Downloading curiosity archive`);
            const response = yield fetch(url);
            if (!response.ok) {
                throw new Error(`Failed to fetch curiosity archive: ${response.statusText}`);
            }
            core.info(`Unpacking curiosity archive to ${tmp}`);
            yield streamPipeline(response.body, tar.x({ cwd: tmp, gzip: true }));
            core.info(`Setting up build observables via ${setup}`);
            (0, child_process_1.execSync)(`bash ${setup}`, { stdio: "inherit" });
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
            const scriptPath = path.join(__dirname, "../scripts/collect_observables.sh");
            if (!fs.existsSync(scriptPath)) {
                throw new Error(`Post script not found at: ${scriptPath}`);
            }
            const logsScriptPath = path.join(__dirname, "../scripts/collect_curiosity_logs.sh");
            if (!fs.existsSync(logsScriptPath)) {
                throw new Error(`Logs script not found at: ${logsScriptPath}`);
            }
            const unwrapScriptPath = path.join(__dirname, "../scripts/unwrap.sh");
            if (!fs.existsSync(unwrapScriptPath)) {
                throw new Error(`Unwrapping script not found at: ${unwrapScriptPath}`);
            }
            (0, child_process_1.execSync)(`bash ${unwrapScriptPath}`, { stdio: "inherit" });
            (0, child_process_1.execSync)(`bash ${logsScriptPath}`, { stdio: "inherit" });
            (0, child_process_1.execSync)(`bash ${scriptPath}`, { stdio: "inherit" });
            core.info(`Done emitting observables json - calling chalk env`);
            (0, child_process_1.execSync)(`chalk env`, { stdio: "inherit" });
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
