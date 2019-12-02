/**
 * This is a cleanup script that fixes the most common cause of error from
 * installing Definitely Typed
 * This needs an associated lint rule to prevent the problem from coming back.
 */
const sh = require('shelljs')
const fs = require('fs')

function bifilter(l, pred) {
    const t = []
    const f = []
    for (const x of l) {
        if (pred(x)) {
            t.push(x)
        }
        else {
            f.push(x)
        }
    }
    return [t,f]
}
for (const f of sh.ls('~/DefinitelyTyped/types/*/tsconfig.json')) {
    /** @type {{ files: string[] }} */
    const tsconfig = JSON.parse(fs.readFileSync(f, 'utf8'))
    const [bad, good] = bifilter(tsconfig.files, f => f.endsWith('.d.ts') && f !== 'index.d.ts')
    if (bad.length) {
        console.log('found another bad one!', bad)
        tsconfig.files = good
        fs.writeFileSync(f, JSON.stringify(tsconfig, undefined, 4))
    }
}

for (const f of sh.ls('~/DefinitelyTyped/types/*/v*/tsconfig.json')) {
    /** @type {{ files: string[] }} */
    const tsconfig = JSON.parse(fs.readFileSync(f, 'utf8'))
    const [bad, good] = bifilter(tsconfig.files, f => f.endsWith('.d.ts') && f !== 'index.d.ts')
    if (bad.length) {
        console.log('found another bad one!', bad)
        tsconfig.files = good
        fs.writeFileSync(f, JSON.stringify(tsconfig, undefined, 4))
    }
}

for (const f of sh.ls('~/DefinitelyTyped/types/*/ts*/tsconfig.json')) {
    /** @type {{ files: string[] }} */
    const tsconfig = JSON.parse(fs.readFileSync(f, 'utf8'))
    const [bad, good] = bifilter(tsconfig.files, f => f.endsWith('.d.ts') && f !== 'index.d.ts')
    if (bad.length) {
        console.log('found another bad one!', bad)
        tsconfig.files = good
        fs.writeFileSync(f, JSON.stringify(tsconfig, undefined, 4))
    }
}
