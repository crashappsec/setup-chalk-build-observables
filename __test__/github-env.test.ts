import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { applyGithubEnv, parseGithubEnvHeredocHeader } from "../src/github-env";

describe("parseGithubEnvHeredocHeader", () => {
  it("parses a valid GitHub env heredoc header", () => {
    expect(parseGithubEnvHeredocHeader("MULTILINE<<EOF")).toEqual({
      key: "MULTILINE",
      delimiter: "EOF",
    });
  });

  it("treats the full suffix after the heredoc marker as the delimiter", () => {
    expect(parseGithubEnvHeredocHeader("KEY<<EOF=with=equals")).toEqual({
      key: "KEY",
      delimiter: "EOF=with=equals",
    });
  });

  it("rejects empty keys, empty delimiters, and assignment-like keys", () => {
    expect(parseGithubEnvHeredocHeader("<<EOF")).toBeUndefined();
    expect(parseGithubEnvHeredocHeader("KEY<<")).toBeUndefined();
    expect(parseGithubEnvHeredocHeader("KEY=value<<EOF")).toBeUndefined();
    expect(parseGithubEnvHeredocHeader("KEY<name<<EOF")).toBeUndefined();
  });

  it("does not parse normal KEY=VALUE env lines as heredoc headers", () => {
    expect(parseGithubEnvHeredocHeader("KEY=value")).toBeUndefined();
  });
});

describe("applyGithubEnv", () => {
  it("applies KEY=VALUE and heredoc entries with the last value winning", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "github-env-test-"));
    const githubEnv = path.join(tmp, "env");
    fs.writeFileSync(
      githubEnv,
      [
        "PLAIN=one",
        "MULTILINE<<EOF",
        "line 1",
        "line 2",
        "EOF",
        "PLAIN=two",
      ].join("\n"),
    );

    expect(applyGithubEnv({ GITHUB_ENV: githubEnv })).toEqual({
      GITHUB_ENV: githubEnv,
      MULTILINE: "line 1\nline 2",
      PLAIN: "two",
    });
  });
});
