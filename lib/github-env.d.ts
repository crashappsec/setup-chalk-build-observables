export interface GithubEnvHeredocHeader {
    key: string;
    delimiter: string;
}
export declare function parseGithubEnvHeredocHeader(line: string): GithubEnvHeredocHeader | undefined;
export declare function applyGithubEnv(env: NodeJS.ProcessEnv): NodeJS.ProcessEnv;
