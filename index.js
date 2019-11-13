const sh = require('shelljs')
const path = require('path')
const assert = require('assert')
const fs = require('fs')
/**
 * @param {string} directory
 * @param {object} options
 */
function createConfig(directory, options) {
    fs.writeFileSync('package.json', `
{
  "name": "dt-package-tester-${directory}",
  "version": "1.0.0",
  "description": "Install @types and run their tests from Definitely Typed",
  "main": "index.js",
  "scripts": {
    "test": "node index.js"
  },
  "repository": {
    "type": "git",
    "url": "git+https://github.com/sandersn/dt-package-tester.git"
  },
  "keywords": [
    "definitely",
    "typed",
    "types"
  ],
  "author": "Nathan Shively-Sanders",
  "license": "MIT",
  "bugs": {
    "url": "https://github.com/sandersn/dt-package-tester/issues"
  },
  "homepage": "https://github.com/sandersn/dt-package-tester#readme"
}
`)
    if (options.strict) {
        options.noImplicitAny = true
        options.noImplicitThis = true
        options.strictNullChecks = true
        options.strictFunctionTypes = true
    }
    assert.notStrictEqual(undefined, options.noImplicitAny)
    assert.notStrictEqual(undefined, options.noImplicitThis)
    assert.notStrictEqual(undefined, options.strictNullChecks)
    assert.notStrictEqual(undefined, options.strictFunctionTypes)

    fs.writeFileSync('tsconfig.json', JSON.stringify({
    "compilerOptions": {
        "target": options.target,
        "module": "commonjs",
        lib: options.lib,
        "noImplicitAny": options.noImplicitAny,
        "noImplicitThis": options.noImplicitThis,
        "strictNullChecks": options.strictNullChecks,
        "strictFunctionTypes": options.strictFunctionTypes,
        "experimentalDecorators": !!options.experimentalDecorators,
        "types": [],
        "noEmit": true,
        "forceConsistentCasingInFileNames": true
    }
}
))
}

sh.mkdir('mirror')
sh.cd('mirror')
const isTestFile = /.+DefinitelyTyped\/types\/([^/]+)\/(.+\.ts)$/
const isTypeReference = /<reference types="([^"]+)" *\/>/g
for (const d of sh.ls("~/DefinitelyTyped/types")) {
    sh.mkdir(d)
    sh.cd(d)
    const sourceTsconfig = JSON.parse(fs.readFileSync(`/home/nathansa/DefinitelyTyped/types/${d}/tsconfig.json`, 'utf8'))
    assert.notStrictEqual(undefined, sourceTsconfig.compilerOptions)
    assert.notStrictEqual(undefined, sourceTsconfig.compilerOptions.lib)
    createConfig(d, sourceTsconfig.compilerOptions)
    sh.exec(`npm install @types/${d}`)
    for (const f of sh.find(`~/DefinitelyTyped/types/${d}`)) {
        const testFileMatch = f.match(isTestFile)
        if (testFileMatch && !f.endsWith('.d.ts')) {
            assert.equal(testFileMatch[1], d)
            const target = testFileMatch[2]

            const testFile = fs.readFileSync(f, 'utf8')
            // read each file and look for `<reference types='...'/> and `npm install @types/${...}`
            for (const typeReference of testFile.matchAll(isTypeReference)) {
                sh.exec(`npm install @types/${typeReference[1]}`)
            }

            sh.mkdir('-p', path.dirname(target))
            if (testFile.indexOf('import') === -1) {
                fs.writeFileSync(target, `/// <reference types="${d}"/>
` + testFile)
            }
            else {
                sh.cp('-u', f, target)
            }
        }
    }
    const result = sh.exec('tsc')
    if (result.code !== 0) {
        const expected = sh.grep('\\$ExpectError', sh.find('**/*.ts')).split('\n').length - 1
        const actual = Array.from(result.stdout.matchAll(/error TS/g)).length
        console.log(`${expected} $ExpectErrors; errors from tsc: ${actual}`)
        if (d === 'adone' && expected + 2 === actual) // adone has errors as shipped
            continue
        else if (expected !== actual)
            process.exit(actual)
    }
    sh.cd('..')
}
