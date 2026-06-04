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
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseGithubEnvHeredocHeader = parseGithubEnvHeredocHeader;
exports.applyGithubEnv = applyGithubEnv;
const fs = __importStar(require("fs"));
function parseGithubEnvHeredocHeader(line) {
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
function applyGithubEnv(env) {
    const file = env.GITHUB_ENV;
    if (!file || !fs.existsSync(file)) {
        return env;
    }
    const merged = Object.assign({}, env);
    const lines = fs.readFileSync(file, "utf8").split("\n");
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const heredoc = parseGithubEnvHeredocHeader(line);
        if (heredoc) {
            const { key, delimiter } = heredoc;
            const buf = [];
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
