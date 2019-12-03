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
        },
        exclude: ["v0", "v1","v2","v3","v4","v5","v6","v7","v8","v9","v1*","ts3*"]
    }))
}

const isTestFile = /.+DefinitelyTyped\/types\/([^/]+)\/(.+\.tsx?)$/
const isTypeReference = /\/\/\/ *<reference types="([^"]+)" *\/>/g
const isESImport = /(?:^|\n)import[^'"]+?['"]([^'"]+?)['"]/g
const isImportRequire =  /(?:^|\n)import.+ = require\(['"]([^"]+?)['"]\)/g
/**
 * @param {string} dir
 * @returns {(f: string) => void}
 */
function installDependencies(dir) {
    return file => {
        const testFileMatch = file.match(isTestFile) // ~/DefinitelyTyped/types/(FOO)/(foo-test.ts)
        if (testFileMatch && !file.endsWith('.d.ts')) {
            assert.equal(testFileMatch[1], dir)
            const target = testFileMatch[2].replace(/^ts3\..\//, '')

            const testFile = fs.readFileSync(file, 'utf8')
            // read each file and look for `<reference types='...'/>`, `import = require` and `import ... from`, then `npm install @types/${...}`
            const imports = [
                ...testFile.matchAll(isTypeReference),
                ...testFile.matchAll(isESImport),
                ...testFile.matchAll(isImportRequire),
            ].map(match => mangleScopes(match[1]))
            console.log(file, imports)
            for (const i of imports.filter(name => sh.test('-d', `~/DefinitelyTyped/types/${name}`) && name.indexOf('/') < 2)) {
                sh.exec(`npm install @types/${i}`)
            }
            sh.mkdir('-p', path.dirname(target))
            if (imports.indexOf(dir) === -1) {
                sh.exec(`npm install @types/${dir}`)
                // TODO: References to ".." and "." should be forbidden in tests (and maybe ".." forbidden in types too)
                fs.writeFileSync(target, `/// <reference types="${dir}"/>
` + testFile.replace(/(["'])\.\.?\1/g, '"' + dir + '"').replace(/<reference types="(\.\.\/?)+/g, '<reference types="'))
            }
            else {
                sh.cp('-u', file, target)
            }
        }
    }
}

/**
 * @param {string} name
 */
function mangleScopes(name) {
    return name[0] === '@' ? name.slice(1).replace('/', '__') : name
}

sh.mkdir('mirror')
sh.cd('mirror')
// chromecast-caf-sender // missing dependency @types/chrome, from <reference>
// d3-cloud (and dc) -- d3 in generated package.json is d3^3 (not sure why, but it's correct), but no warning for installing d3@5
// egjs__axes -- missing dependency @types/egjs__component, from an import
/** @type {{ [s: string]: string[] }} */
const results = JSON.parse(fs.readFileSync('results.json', 'utf8'))
for (const dir of sh.ls("~/DefinitelyTyped/types")) {
    if (results[dir]) continue
    results[dir] = []
    console.log(`==================================================== ${dir} ================================`)
    sh.mkdir(dir)
    sh.cd(dir)
    const sourceTsconfig = JSON.parse(fs.readFileSync(`/home/nathansa/DefinitelyTyped/types/${dir}/tsconfig.json`, 'utf8'))
    assert.notStrictEqual(undefined, sourceTsconfig.compilerOptions)
    assert.notStrictEqual(undefined, sourceTsconfig.compilerOptions.lib)
    createConfig(dir, sourceTsconfig.compilerOptions)
    const typesVersions = sh.ls('-d', `~/DefinitelyTyped/types/${dir}/ts3.*`)
    const source = typesVersions.length ? typesVersions[typesVersions.length - 1] : `~/DefinitelyTyped/types/${dir}`
    sh.find(source).forEach(installDependencies(dir))
    const result = sh.exec('node ~/ts/built/local/tsc.js')
    if (result.code !== 0) {
        const errors = result.stdout.matchAll(/(\S+\.ts)\((\d+),(\d+)\): error TS/g)
        let newFailures = false
        for (const err of errors) {
            const filename = err[1]
            const line = +err[2]
            const offset = +err[3]
            const lines = fs.readFileSync(filename, 'utf8').split('\n')
            if (lines[line - 1].indexOf('$ExpectError') === -1 && (line < 2 || lines[line - 2].indexOf('$ExpectError') === -1)) {
                console.log(`    Did not find $ExpectError for ${filename}(${line},${offset}):`)
                console.log(lines[line - 2])
                console.log(lines[line - 1])
                results[dir].push(`    Did not find $ExpectError for ${filename}(${line},${offset}):`)
                results[dir].push(lines[line - 2])
                results[dir].push(lines[line - 1])
                newFailures = true
            }
        }
        if (newFailures) {
            sh.exec('play -q ~/Music/ogg/Undertale/mus_wawa.ogg -t alsa gain -13 trim 0 2.6 &')
        }
    }
    sh.cd('..')
    fs.writeFileSync('results.json', JSON.stringify(results, undefined, 4))
}
