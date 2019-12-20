type Tsconfig = {
    name: string,
    dependencies: { [s: string]: string },
    publishConfig?: { registry: string },
    repository: { url: string },
}
declare module "download-file-sync" {
    function f(url: string): string;
    export = f;
}
declare module "npm-api" {
    namespace NpmApi {
        interface Package {
            [s: string]: any
            typings?: string
            types?: string
            repository?: {
                type: 'git' | 'x'
                url: string
            }
            dependencies: { [s: string]: string }
            devDependencies: { [s: string]: string }
            dist: {
                integrity: string
                shasum: string
                tarball: string
                fileCount: number
                unpackedSize: number
                'npm-signature': string
            }
        }
    }
    class Repo {
        constructor(name: string)
        package(version?: string): Promise<NpmApi.Package>
    }
    class NpmApi {
        Repo: typeof Repo
    }
    export = NpmApi
}
declare module "tar" {
    type Options = {
        sync: boolean
        file: string
        filter?(name: string): boolean
    }
    export function list(options: Options): void
    export function extract(options: Options): void
}
declare module "types-registry" {
    const json: {
        entries: {
            [s: string]: {
                latest: string
                [s: string]: string
            }
        }
    }
    export = json
}
