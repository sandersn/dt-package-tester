# dt-package-tester
Install @types packages and run their tests from Definitely Typed

Packages are installed in mirror/; the code expects Definitely Typed to reside at /home/nathansa/DefinitelyTyped.

TODO: This generates result.json; I still need to save that somewhere else, modify the script to install @testtypepublishing packages from Github and run it that, then diff the two jsons.

# cleanup-tsconfig

Remove all d.ts files from Definitely Typed tsconfigs that are *not* index.d.ts.
Also prints the tsconfigs that violate this property.
You should save this output in a file named /home/nathansa/types-publisher/doubt2.txt for running cleanup-tsconfig2.

Seriously.

The code expects Definitely Typed to reside at ~/DefinitelyTyped.

# cleanup-tsconfig2

This script overgenerates OTHER_FILES.txt, but I can't remember by how much.
I would not use it again.

# install-types-registry

Take the types-registry json, whatever it's named, and iterate through each package and each tag in the package.
Download the tgz of each unique version of the package from npm and unzip it into npm-install/package-1.2/
Convert the downloaded output of npm to github-publishable code and copy to github-publish/package-1.2/.

Downloading the tgz should also work with github (to github-install/package/1.2).

# publish-to-github

Iterate through each unique version of packages from types-registry.
Publish each package to @testtypepublishing on github.
(This is just `npm publish` on each directory in github-publisher.)

After this works well, merge it with convert-to-github.

# compare-npm-to-github

Iterate through each unique version of packages from types-registry.
Diff the files and contents of each package in npm-install/ vs github-install/.
They should be the same except for one or two diffs.
