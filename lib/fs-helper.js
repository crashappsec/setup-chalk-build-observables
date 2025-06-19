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
exports.directoryExistsSync = directoryExistsSync;
exports.existsSync = existsSync;
exports.fileExistsSync = fileExistsSync;
const fs = __importStar(require("fs"));
function directoryExistsSync(path, required) {
    var _a;
    if (!path) {
        throw new Error("Arg 'path' must not be empty");
    }
    let stats;
    try {
        stats = fs.statSync(path);
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.code) === 'ENOENT') {
            if (!required) {
                return false;
            }
            throw new Error(`Directory '${path}' does not exist`);
        }
        throw new Error(`Encountered an error when checking whether path '${path}' exists: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
    }
    if (stats.isDirectory()) {
        return true;
    }
    else if (!required) {
        return false;
    }
    throw new Error(`Directory '${path}' does not exist`);
}
function existsSync(path) {
    var _a;
    if (!path) {
        throw new Error("Arg 'path' must not be empty");
    }
    try {
        fs.statSync(path);
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.code) === 'ENOENT') {
            return false;
        }
        throw new Error(`Encountered an error when checking whether path '${path}' exists: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
    }
    return true;
}
function fileExistsSync(path) {
    var _a;
    if (!path) {
        throw new Error("Arg 'path' must not be empty");
    }
    let stats;
    try {
        stats = fs.statSync(path);
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.code) === 'ENOENT') {
            return false;
        }
        throw new Error(`Encountered an error when checking whether path '${path}' exists: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : error}`);
    }
    if (!stats.isDirectory()) {
        return true;
    }
    return false;
}
