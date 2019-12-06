const registry = require('types-registry')
const tar = require('tar')
const wget = require('node-wget-promise')
const sh = require('shelljs')
const fs = require('fs')
const path = require('path')
const npmApi = require('npm-api')
const npm = new npmApi()

async function main() {
    for (const packageName in registry.entries) {
        for (const version of new Set(Object.values(registry.entries[packageName]))) {
            const pack = await getPackage("@types/" + packageName, version)
            console.log(packageName, pack.dist.tarball)
            await downloadTar(packageName, pack.dist.tarball)
        }
    }
}
main().catch(e => { console.log(e); process.exit(1) })

/**
 * @param {string} name
 * @param {string} version
 * @return {Promise<import('npm-api').Package>}
 */
function getPackage(name, version) {
    return new npm.Repo(name).package(version)
}

/**
 * @param {string} packageName
 * @param {string} url
 */
async function downloadTar(packageName, url) {
    let filepath = path.join("npm-install", path.basename(url))
    if (!fs.existsSync(filepath)) {
        await wget(url, { output: filepath })
        tar.extract({ sync: true, file: filepath })
        sh.mv(packageName, path.join("npm-install", path.basename(url).slice(0, path.basename(url).length - 4)))
    }
}
