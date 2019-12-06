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
            await downloadTar(packageName, pack.dist.tarball)
            convertToGithub(packageName + "-" + version)
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
    if (fs.existsSync(filepath)) return

    console.log(packageName, url)
    await wget(url, { output: filepath })
    tar.extract({ sync: true, file: filepath })
    sh.mv(packageName, filepath.slice(0, filepath.length - 4))
}

/** @param {string} fullname */
function convertToGithub(fullname) {
    if (fs.existsSync(path.join("github-publish", fullname))) return

    sh.mkdir('-p', path.join("github-publish", fullname))
    for (const file of sh.find(path.join("npm-install", fullname))) {
        const newfile = file.replace("npm-install/", "github-publish/")
        if (path.basename(file) === "package.json") {
            let packageJSON = JSON.parse(fs.readFileSync(file, 'utf8'))
            packageJSON.publishConfig = { registry: "https://npm.pkg.github.com/" }
            packageJSON.name = packageJSON.name.replace("@types/", "@testtypepublishing/")
            fs.writeFileSync(newfile, JSON.stringify(packageJSON, undefined, 4))
        } else {
            sh.cp(file, newfile)
        }
    }
}
