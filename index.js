const sh = require('shelljs')
const path = require('path')
const assert = require('assert')
const fs = require('fs')
function createConfig(directory) {
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
    // TODO: lib might vary per-project and need to be copied?
    fs.writeFileSync('tsconfig.json', `{
    "compilerOptions": {
        "module": "commonjs",
        "lib": [
            "es5",
            "dom",
            "es2015.iterable",
            "es2015.promise"
        ],
        "noImplicitAny": true,
        "noImplicitThis": true,
        "strictNullChecks": true,
        "strictFunctionTypes": true,
        "types": [],
        "noEmit": true,
        "forceConsistentCasingInFileNames": true
    }
}
`)
}

sh.mkdir('mirror')
sh.cd('mirror')
const isTestFile = /.+DefinitelyTyped\/types\/([^/]+)\/(.+\.ts)$/
const isTypeReference = /<reference types="([^"]+)"\/>/g
for (const d of sh.ls("~/DefinitelyTyped/types")) {
    // if (d !== 'ace') continue
    sh.mkdir(d)
    sh.cd(d)
    createConfig(d)
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
            if (testFile.indexOf('import') === -1) {
                // add global reference to index.d.ts if no imports
                fs.writeFileSync(target, `/// <reference path="node_modules/@types/${d}/index.d.ts"/>
` + testFile)
            }
            else {
                sh.cp('-u', f, target)
            }
            sh.mkdir('-p', path.dirname(target))
        }
    }
    const result = sh.exec('tsc --diagnostics')
    if (result.code !== 0) process.exit(result.code)
    sh.cd('..')
}
