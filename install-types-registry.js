const registry = require('types-registry')
const tar = require('tar')
const wget = require('node-wget-promise')
const sh = require('shelljs')
const fs = require('fs')
const path = require('path')
const npmApi = require('npm-api')
const npm = new npmApi()

async function main() {
    let i = 0
    for (const packageName in registry.entries) {
        if (!(i % 100)) console.log(packageName)
        for (const version of new Set(Object.values(registry.entries[packageName]))) {
            const pack = await getPackage('@types/' + packageName, version)
            await downloadTar(packageName, pack.dist.tarball)
            convertToGithub(packageName + '-' + version)
        }
        i++
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
    let tgzpath = path.join('npm-install', path.basename(url))
    let dirpath = tgzpath.slice(0, tgzpath.length - 4)
    if (fs.existsSync(dirpath)) return

    console.log(packageName, url)
    await wget(url, { output: tgzpath })
    tar.extract({ sync: true, file: tgzpath })
    sh.mv(packageName, dirpath)
}

/**
 * @param {object} o
 * @param {(k: any) => any} f
 */
function mapKeys(o, f) {
    /** @type {{ [s: string]: any }} */
    const o2 = {}
    for (const k in o) {
        o2[f(k)] = o[k]
    }
    return o2
}

/** @param {string} packageName */
function convertToGithub(packageName) {
    // if (fs.existsSync(path.join('github-publish', fullname))) return

    sh.mkdir('-p', path.join('github-publish', packageName))
    for (const file of sh.find(path.join('npm-install', packageName))) {
        const newfile = file.replace('npm-install/', 'github-publish/')
        if (file === path.join('npm-install', packageName)) {
            ; // skipped !
        } else if (path.extname(file) === '' || /ts3\.\d$/.test(file)) {
            sh.mkdir('-p', newfile)
        } else if (path.basename(file) === 'package.json') {
            /** @type {Tsconfig} */
            let packageJSON = JSON.parse(fs.readFileSync(file, 'utf8'))
            packageJSON.publishConfig = { registry: 'https://npm.pkg.github.com/' }
            packageJSON.name = packageJSON.name.replace('@types/', '@testtypepublishing/')
            packageJSON.dependencies = mapKeys(packageJSON.dependencies, d => d.replace('@types/', '@testtypepublishing/'))
            fs.writeFileSync(newfile, JSON.stringify(packageJSON, undefined, 4))
        } else {
            sh.cp(file, newfile)
        }
    }
}
