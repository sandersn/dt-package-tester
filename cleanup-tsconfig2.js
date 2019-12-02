/**
 * Create OTHER_FILES.txt in each directory
 * This is a cleanup script that fixes the most common cause of error from
 * installing Definitely Typed
 * This needs an associated lint rule to prevent the problem from coming back.
 */
const path = require('path')
const fs = require('fs')

const unused = fs.readFileSync('/home/nathansa/types-publisher/doubt2.txt', 'utf8').split('\n')
var i = 0
/** @type {string} */
let current = undefined
let group = []
for (const line of unused) {
    const packageName = getPackageName(line)
    if (packageName !== current) {
        writeGroup(current, group)
        current = packageName
        group = []
    }
    group.push(line.slice(packageName.length + 1))
}
writeGroup(current, group)

/** @param {string} line */
function getPackageName(line) {
    const [packageName] = line.split('/')
    if (line.slice(packageName.length + 1).match(/^v\d+/)) {
        return packageName + '/' + line.slice(packageName.length + 1).split('/')[0]
    }
    else if (line.slice(packageName.length + 1).match(/ts\d\.\d/)) {
        return packageName + '/' + line.slice(packageName.length + 1).split('/')[0]
    }
    return packageName
}

/**
 * {string} packageName
 * {string[]} group
 */
function writeGroup(packageName, group) {
    i++
    if (!packageName) return
    fs.writeFileSync(path.join('/home/nathansa/DefinitelyTyped/types', packageName, 'OTHER_FILES.txt'), group.join('\n'))
    console.log(i, packageName, group)
}
