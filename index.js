const sh = require('shelljs')
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
for (const d of sh.ls("~/DefinitelyTyped/types")) {
    sh.mkdir(d)
    sh.cd(d)
    createConfig(d)
    sh.exec(`npm install @types/${d}`)
    for (const f of sh.find(`~/DefinitelyTyped/types/${d}`)) {
        console.log(f)
        if (f.endsWith('.ts') && !f.endsWith('.d.ts')) {
            // TODO: Doesn't work with trees of tests because it'll copy them too deep. I think
            sh.cp(f, './')
        }
    }
    sh.exec('tsc')
    sh.cd('..')
    break
}
