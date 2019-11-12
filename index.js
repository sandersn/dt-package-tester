const sh = require('shelljs')
const fs = require('fs')
sh.mkdir('mirror')
sh.cd('mirror')
for (const d of sh.ls("~/DefinitelyTyped/types")) {
    sh.mkdir(d)
    sh.cd(d)
    fs.writeFileSync('package.json', `
{
  "name": "dt-package-tester-${d}",
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
`);
    sh.exec(`npm install @types/${d}`)
    sh.cd('..')
}
