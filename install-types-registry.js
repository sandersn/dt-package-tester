const registry = require('types-registry')
const tar = require('tar')
const wget = require('node-wget-promise')
const sh = require('shelljs')
const fs = require('fs')
const path = require('path')

function main() {
    let i = 0
    for (const packageName in registry.entries) {
        if (packageName !== 'akamai-edgeworkers') continue
        if (!(i % 100)) console.log(packageName)
        for (const version of new Set(Object.values(registry.entries[packageName]))) {
            const url = getPackage('@types/' + packageName, version)
            sh.cd('npm-install')
            downloadTar(packageName, url.slice(0, url.length - 1), version)
            sh.cd('..')
            convertToGithub(packageName + '-' + version)
            publishToGithub(packageName + '-' + version)
        }
        sh.exec(`npm dist-tag add @types/${packageName}@${registry.entries[packageName].latest} latest --registry=https://npm.pkg.github.com`)
        i++
    }
}
main()

/**
 * @param {string} name
 * @param {string} version
 * @return {string}
 */
function getPackage(name, version) {
    return sh.exec(`npm info ${name}@${version} dist.tarball`).stdout
}

/**
 * @param {string} packageName
 * @param {string} url
 * @param {string} version
 */
function downloadTar(packageName, url, version) {
    let tgzpath = path.basename(url)
    let dirpath = tgzpath.slice(0, tgzpath.length - 4)
    if (fs.existsSync(dirpath)) return

    console.log(packageName, url, tgzpath)
    sh.exec(`wget -O ${tgzpath} ${url}`)
    sh.exec(`tar -xvf ${tgzpath}`)
    sh.mv(packageName, packageName + '-' + version)
    sh.mv('package', packageName + '-' + version)
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
    // if (fs.existsSync(path.join('github-publish', packageName))) return

    sh.mkdir('-p', path.join('github-publish', packageName))
    for (const file of sh.find(path.join('npm-install', packageName))) {
        const newfile = file.replace('npm-install/', 'github-publish/')
        if (file === path.join('npm-install', packageName)) {
            ; // skipped !
        } else if (path.extname(file) === '' && path.basename(file) !== 'LICENSE' || /ts3\.\d$/.test(file)) {
            sh.mkdir('-p', newfile)
        } else if (path.basename(file) === 'package.json') {
            /** @type {Tsconfig} */
            let packageJSON = JSON.parse(fs.readFileSync(file, 'utf8'))
            packageJSON.publishConfig = { registry: 'https://npm.pkg.github.com/' }
            packageJSON.repository.url = "https://github.com/types/_definitelytypedmirror.git"
            fs.writeFileSync(newfile, JSON.stringify(packageJSON, undefined, 4))
        } else {
            sh.cp(file, newfile)
        }
    }
}

/**
 * @param {string} packageName
 * @return false if the package was already published */
function publishToGithub(packageName) {
    sh.cd(path.join('github-publish', packageName))
    const res = sh.exec('npm publish')
    sh.cd('../..')
    return res.code === 0 || res.stderr.indexOf("EPUBLISHCONFLICT") === -1
}
