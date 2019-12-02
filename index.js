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
        const testFileMatch = file.match(isTestFile)
        if (testFileMatch && !file.endsWith('.d.ts')) {
            assert.equal(testFileMatch[1], dir)
            const target = testFileMatch[2]

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
` + testFile.replace(/["']\.\.?["']/g, '"' + dir + '"'))
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
// 1. only d.ts allowed in tsconfig should be index.d.ts (exceptions for globals? maybe, but they would remain hard to use)
// 2. no relative imports in tests, they are asking for trouble even if they could theoretically be correct
// 3. lol @ the number of packages with no tests
const skiplist = [
    'adone', // inter-file UMD references fail, need to investigate
    'ansi-styles', // local reference to .d.ts file in test, should be disallowed by linter (but it's unused, so skip for our purposes)
    'ansicolors', // no tests!!!!!!! (and angular-cookies)
    'aos', // global file in DT compilation isn't there in a real one (probably same as adone)
    // need a lint rule that says if index.d.ts is a module then index.d.ts must be the ONLY d.ts in "files" in tsconfig
    'auth0.widget', // depends on <reference types="auth0-js/v7" />, which needs to be rewritten to <reference types="auth0-js" /> to work
    // not sure what the general solution is, but types="xxx/vN" should not be allowed
    // babel__template uses relative paths in tests to refer to its package, this should be disallowed too
    'chromecast-caf-sender', // we miss a dependency on @types/chrome that should arise from <reference types="chrome/chrome-cast" /> in types-publisher
    'cldrjs', // same: reference to globals defined in a file outside index.d.ts.
    'clearbladejs-client', // same
    'clearbladejs-server', // same, clearblade types are just wrong
    'codemirror', // same, unreferenced global d.ts
    'config', // relative import in test
    'crypto-js', // relative import in test
    'cssbeautify', // relative import in test
    'd3-cloud', // relative import in test
]
for (const dir of sh.ls("~/DefinitelyTyped/types")) {
    if (dir < 'd3-cloud') continue
    console.log(`==================================================== ${dir} ================================`)
    sh.mkdir(dir)
    sh.cd(dir)
    const sourceTsconfig = JSON.parse(fs.readFileSync(`/home/nathansa/DefinitelyTyped/types/${dir}/tsconfig.json`, 'utf8'))
    assert.notStrictEqual(undefined, sourceTsconfig.compilerOptions)
    assert.notStrictEqual(undefined, sourceTsconfig.compilerOptions.lib)
    createConfig(dir, sourceTsconfig.compilerOptions)
    sh.find(`~/DefinitelyTyped/types/${dir}`).forEach(installDependencies(dir))
    const result = sh.exec('node ~/ts/built/local/tsc.js')
    if (result.code !== 0 && skiplist.indexOf(dir) === -1) {
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
                sh.exec('play -q ~/Music/ogg/Undertale/mus_wawa.ogg -t alsa gain -13 trim 0 2.6 &')
                process.exit(1)
            }
        }
    }
    sh.cd('..')
}
