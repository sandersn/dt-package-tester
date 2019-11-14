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
        jsx: options.jsx,
        "noImplicitAny": options.noImplicitAny,
        "noImplicitThis": options.noImplicitThis,
        "strictNullChecks": options.strictNullChecks,
        "strictFunctionTypes": options.strictFunctionTypes,
        "experimentalDecorators": options.experimentalDecorators,
        "esModuleInterop": options.esModuleInterop,
        "allowSyntheticDefaultImports": options.allowSyntheticDefaultImports,
        "types": [],
        "noEmit": true,
        "forceConsistentCasingInFileNames": true
    }
}
))
}

const isTestFile = /.+DefinitelyTyped\/types\/([^/]+)\/(.+\.tsx?)$/
const isTypeReference = /<reference types="([^"]+)" *\/>/g
const isESImport = /import.+from ['"]([^'"]+?)['"]/g
const isImportRequire =  /import.+ = require\(['"]([^"]+?)['"]\)/g
/**
 * @param {string} d
 * @returns {(f: string) => void}
 */
function installDependencies(d) {
    return f => {
        const testFileMatch = f.match(isTestFile)
        if (testFileMatch && !f.endsWith('.d.ts')) {
            assert.equal(testFileMatch[1], d)
            const target = testFileMatch[2]

            const testFile = fs.readFileSync(f, 'utf8')
            // read each file and look for `<reference types='...'/>`, `import = require` and `import ... from`, then `npm install @types/${...}`
            const imports = [
                ...testFile.matchAll(isTypeReference),
                ...testFile.matchAll(isESImport),
                ...testFile.matchAll(isImportRequire),
            ].map(match => match[1])
            console.log(f, imports)
            for (const i of imports.filter(name => sh.test('-d', `~/DefinitelyTyped/types/${name}`) && name.indexOf('/') === -1)) {
                sh.exec(`npm install @types/${i}`)
            }
            sh.mkdir('-p', path.dirname(target))
            if (imports.indexOf(d) === -1) {
                sh.exec(`npm install @types/${d}`)
                fs.writeFileSync(target, `/// <reference types="${d}"/>
` + testFile)
            }
            else {
                sh.cp('-u', f, target)
            }
        }
    }
}

sh.mkdir('mirror')
sh.cd('mirror')
for (const d of sh.ls("~/DefinitelyTyped/types")) {
    if (d < 'acl') continue
    // if (d < 'angular-es') continue
    console.log(`==================================================== ${d} ================================`)
    sh.mkdir(d)
    sh.cd(d)
    const sourceTsconfig = JSON.parse(fs.readFileSync(`/home/nathansa/DefinitelyTyped/types/${d}/tsconfig.json`, 'utf8'))
    assert.notStrictEqual(undefined, sourceTsconfig.compilerOptions)
    assert.notStrictEqual(undefined, sourceTsconfig.compilerOptions.lib)
    createConfig(d, sourceTsconfig.compilerOptions)
    sh.find(`~/DefinitelyTyped/types/${d}`).forEach(installDependencies(d))
    const result = sh.exec('node ~/ts/built/local/tsc.js')
    // adone has errors as shipped
    if (result.code !== 0 && d !== 'adone') {
        const errors = result.stdout.matchAll(/(\S+\.ts)\((\d+),(\d+)\): error TS/g)
        for (const err of errors) {
            const filename = err[1]
            const line = +err[2]
            const offset = +err[3]
            const lines = fs.readFileSync(filename, 'utf8').split('\n')
            if (lines[line - 1].indexOf('$ExpectError') === -1 && (line < 2 || lines[line - 2].indexOf('$ExpectError') === -1)) {
                console.log(`    Did not find $ExpectError for ${filename}(${line},${offset}):`)
                console.log(lines[line - 2])
                console.log(lines[line - 1])
                process.exit(1)
            }
        }
    }
    sh.cd('..')
}
