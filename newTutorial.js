/**
 * newTutorial.js
 */


const { readdirSync, lstatSync } = require('fs')
const { resolve, join } = require('path')
const { exec } = require("child_process");
require('dotenv').config()
const GITHUB_TOKEN = process.env.GITHUB_TOKEN

const { question } = require('readline-sync');
const organization = __dirname.replace(/(^.*\/)|(\..*$)/g, "")
const parent = resolve( __dirname, ".." )
const public = `../${__dirname.split("/").slice(-1)[0]}/public`

let name = process.argv.slice(2).join(" ")
const isDemo = name === "Demo";

// Ensure name for the new tutorial is unique and usable
name = (function (){
  const TRIM_REGEX = /^-+|-+$/g
  const GIT_REGEX = /([^a-z0-9-]+)|([a-z0-9-]+)/gi

  const existing = readdirSync(parent)
    .filter( name => {
      const path = join(parent, name)
      return lstatSync(path).isDirectory()
    })
    .map( name => name.toLowerCase() )

  const first = `Please provide a name for your tutorial:
(Press Ctrl-C to cancel)
`
  const adjusted = `Name adjusted to comply with GitHub repository naming rules: "%name".
Press Enter to accept "%name",
press Ctrl-C to cancel or
enter a new name:
`
  const notAllowed = `GitHub repository names allow only alpha-numeric ASCII characters.
Please provide a name for your tutorial:
(Press Ctrl-C to cancel)
`
  const notUnique = `The name "%seed" already exists.
Press Enter to use "%name",
press Ctrl-C to cancel, or enter a unique name:
`
  let prompt = ""

  ;({ name, prompt } = sanitize(name) )

  while (prompt) {
    const response = question(prompt);
    if (!response) {
      // The user pressed Enter with no text
      clear(prompt)
      break
    }

    ({ name, prompt } = sanitize(response));

    clear(prompt)
  }

  return name


  function sanitize(name) {
    if (!name) {
      // Only possible when script initially called.
      return {
        name: "",
        prompt: first
      }
    }

    // Check for non-alphanumeric characters
    let match
    const toReplace = []
    const toKeep = []

    while (match = GIT_REGEX.exec(name)) {
      if (match[1]) {
        toReplace.push(match[1])
      }
      if (match[2]) {
        toKeep.push(match[2])
      }
    }

    if (!toKeep.length) {
      // No part of the name is usable
      return {
        name: "",
        prompt: notAllowed
      }
    }

    // There is a usable name. Is it unique?
    name = toKeep.join("-").replace(TRIM_REGEX, "")

    let seed = name
    let ii = 0
    while (!isUnique(name)) {
      name = `${seed}-${++ii}`
    }

    prompt = ii
      ? notUnique.replace("%seed", seed).replace("%name", name)
      : toReplace.length
        ? adjusted.replaceAll("%name", name)
        : "" // name is unique and unchanged

    const output = {
      name,
      prompt
    }

    return output
  }


  function isUnique(name) {
    return existing.indexOf(name.toLowerCase()) < 0
  }


  function clear(prompt) {
    const lines = prompt.split("\n").length + 1
    const clear = '\x1B[1A\x1B[K'.repeat(lines)
    console.log(clear)
  }
})()



console.log("Creating tutorial:", name)

// console.log(`MAKE DIRECTORY STRUCTURE`)
const fullPath = join(parent, name)
const makeDirectories = `mkdir -p ${fullPath}/docs/{md,images}`
exec(makeDirectories, (error, stdout, stderr) => {
  if (error) {
    console.log(`makeDirectories error: ${error.message}`)
    process.exit()
  } else if (stderr) {
    console.log(`stderr: ${stderr}`)
    process.exit()
  }
})



// console.log("ADD publish.js")
const publish = join(fullPath, "publish.js")
const root = `${organization}.github.io`
const script = `touch ${publish} && cat > ${publish} <<EOF
const { resolve, join } = require('path')

const parent = join(__dirname, "..")
const path = resolve(parent, "${root}", ".env")
require('dotenv').config({ path })

const GITHUB_TOKEN = process.env.GITHUB_TOKEN

if (!GITHUB_TOKEN) {
  return console.log("npm run publish: COMMAND FAILED.\\nGitHub personal access token required. Please:\\n* Log in to GitHub.com\\n* Visit https://github.com/settings/tokens\\n* Generate a classic token with repo privileges\\n* Copy the token\\n* Create a file called .env inside your MyTutorials.github.io folder (or whatever your 'Xxx.github.io' folder is called)\\n* Create an entry in .env like:\\n\\n  GITHUB_TOKEN=y0ur_p3R50na1_4ce55_T0k3n_G0e5_h3r3\\n\\n* Save the changes to the .env file\\n* Run 'npm run publish' again.\\n")
}

const headers = {
  'Accept': 'application/vnd.github+json',
  'Authorization': 'Bearer %'.replace("%", GITHUB_TOKEN),
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
}

const body = JSON.stringify({
  source: {
    "branch":"main",
    "path":"/docs"
  }
})

const URL = "https://api.github.com/repos/${organization}/${name}/pages"

fetch(URL, {
  method: 'POST',
  headers,
  body,
})
  .then(response => response.json())
  .then(showResponse)
  .catch(error => console.error("GH-Pages Error:", error));

function showResponse(response) {
  const { status, message, html_url } = response
  if (message) {
    console.log("GitHub Pages says:%n status:  %s%nmessage: %m"
    .replaceAll("%n", "\\n")
    .replace("%s", status)
    .replace("%m", message)
    )
  } else {
    console.log(
      "Page will soon be available at %url"
      .replace("%url", html_url)
    )
  }
}
EOF`

  exec(script, (error, stdout, stderr) => {
    if (error) {
      console.log(`publish.js error: ${error.message}`)
      // process.exit()

    } else if (stderr) {
      console.log(`publish.js stderr: ${stderr}`)
      // process.exit()
    }
  })


// console.log(`GENERATE PACKAGE.JSON`)
const package = join(fullPath, "package.json")
const makePackageJson = `touch ${package} && cat > ${package} <<EOF
{
  "scripts": {
    "pandoc": "pandoc -o docs/index.html --filter public/filter.js --template=public/template.html docs/md/*.md",
    "watch": "node public/watch.js ${name}",
    "publish": "node publish.js"
  },
  "devDependencies": {
    "dotenv": "^16.4.7"
  }
}
EOF`
exec(makePackageJson, (error, stdout, stderr) => {
  if (error) {
    // error: Command failed: touch /Users/james/MERNCraft/Publisher/HTMElves/Tutorial-3/package.json && cat > /Users/james/MERNCraft/Publisher/HTMElves/Tutorial-3/package.json <<EOF
    // {
    //   "scripts": {
    //     "pandoc": "pandoc -o docs/index.html --template=public/template.html docs/md/*.md",
    //     "watch": "node public/watch.js /Users/james/MERNCraft/Publisher/HTMElves/Tutorial-3/docs/md"
    //   }
    // }
    // EOF
    // touch: /Users/james/MERNCraft/Publisher/HTMElves/Tutorial-3/package.json: No such file or directory

    console.log(`package.json error: ${error.message}`)
    process.exit()

  } else if (stderr) {
    console.log(`stderr: ${stderr}`)
    process.exit()
  }


  // console.log(`RUN npm i IN NEW TUTORIAL REPOSITORY`)
  exec(`cd ${fullPath} && npm i`, (error, stdout, stderr) => {
    if (error) {
      console.log(`npm i error: ${error.message}`)
      process.exit()

    } else if (stderr) {
      // IGNORE ERROR LIKE

      // npm i stderr: (node:28778) ExperimentalWarning: CommonJS module /opt/homebrew/lib/node_modules/npm/node_modules/debug/src/node.js is loading ES Module /opt/homebrew/lib/node_modules/npm/node_modules/supports-color/index.js using require().
      // Support for loading ES Module in require() is an experimental feature and might change at any time
      // (Use `node --trace-warnings ...` to show where the warning was created)

      // console.log(`npm i stderr: ${stderr}`)
      // process.exit()
    }


    // console.log(`INSTALL public SYMLINK`)
    let link = join(fullPath, "public")
    exec(`ln -s ${public} ${link}`, (error, stdout, stderr) => {
      if (error) {
        console.log(`public symlink error: ${error.message}`)
        process.exit()
      } else if (stderr) {
        console.log(`public symlink stderr: ${stderr}`)
        process.exit()
      }
    })



    // console.log(`INSTALL images SYMLINK IN docs/md`)
    link = join(fullPath, "docs", "md")
    exec(`ln -s "../images" ${link}`, (error, stdout, stderr) => {
      if (error) {
        console.log(`images symlink error: ${error.message}`)
        process.exit()
      } else if (stderr) {
        console.log(`images symlink stderr: ${stderr}`)
        process.exit()
      }
    })



    // console.log(`INITIALIZE GIT`)
    const gitignore = `${fullPath}/.gitignore`
    const makeIgnore = `touch ${gitignore} && cat > ${gitignore} <<EOF
node_modules/
.env
.DS_Store
.vscode/*
!.vscode/extensions.json
Icon?
![iI]con[_a-zA-Z0-9-]
public
docs/md/images
Notes/
EOF
  `
    exec(makeIgnore, (error, stdout, stderr) => {
      if (error) {
        console.log(`.gitignore error: ${error.message}`)
        process.exit()
      } else if (stderr) {
        console.log(`.gitignore stderr: ${stderr}`)
        process.exit()
      }
    })


    exec(`cd ${fullPath} && git init`, (error, stdout, stderr) => {
      if (error) {
        console.log(`git init error: ${error.message}`)
        process.exit()
      } else if (stderr) {
        console.log(`git init stderr: ${stderr}`)
        process.exit()
      }
      // console.log("stdout:", stdout)
      // // Initialized empty Git repository ...

      createAndConvertMDFile()
    })
  })
})



function createAndConvertMDFile() {
  // console.log(`CREATE PLACEHOLDER .md FILE(S) AT doc/md/`)
  const month = (() => {
    const now = new Date()
    const month = now.toLocaleString("en-GB", { month: "long" })
    const year = now.getFullYear()
    return `${month} ${year}`
  })()

  let mdFiles

  if (isDemo) {
    mdFiles = [
      { file: `${fullPath}/docs/md/99-Introduction.md`,
        cat: `touch %file && cat > %file <<'EOF'
---
title: Demo Tutorial
subtitle: (replace with your own content)
month: ${month}
organization: ${organization}
repo: ${name}
---
<section
  id="introduction"
  aria-labelledby="introduction"
  data-item="Introduction"
>
  <h2><a href="#introduction">Introduction</a></h2>

***Congratulations!***

If this ${'`'}index.html${'`'} page has opened in your browser, then your Markdown to HTML conversion process is working. If this is your first time using the HTM-Elves workflow, then your next step is to publish this tutorial, just as it is, on GitHub. When you have followed the process through to the end, the workflow will become clear.

This tutorial will explain how to publish this demo tutorial, unchanged, on GitHub.

![](https://htm-elves.github.io/public/nodoc.svg){style="width: 350px;"}

<details
class="tip"
open
>
<summary>Temporary Content</summary>

You can delete this tutorial from GitHub later, after you have understood the publishing process. Alternatively, you can replace all the content in the Markdown files in the ${'`'}docs/md/${'`'} directory with your own files and content, and publish it as a permanent tutorial.

</details>

### The Story So Far

In the explanation that follows, I will imagine that you:

1. Created a GitHub Organization called ${'`'}${organization}${'`'}
2. Forked the HTM-Elves repository to your Organization, and called your fork ${'`'}${organization}.github.io${'`'}
3. Cloned ${'`'}${organization}.github.io${'`'} to your development computer
4. Ran ${'`'}npm run demo${'`'} in a Terminal window open at the root of your ${'`'}${organization}.github.io${'`'} directory.

I also imagine that you will use the name ${'`'}${name}${'`'} as the name of the GitHub repository that you will create for this tutorial inside your Organization.

<details
class="pivot"
open
>
<summary>Customizing the Tutorial Names</summary>
Perhaps you chose your own names for your Organization and for your tutorial repository. In the instructions that follow, please replace ${'`'}${organization}.github.io${'`'} and ${'`'}${name}${'`'} with the actual names that you have chosen.

</details>
</section>
EOF`
    },
    { file: `${fullPath}/docs/md/01-Publishing-to-GitHub.md`,
      cat: `touch %file && cat > %file <<'EOF'
<section
id="publishing-to-github"
aria-labelledby="publishing-to-github"
data-item="Publishing To GitHub"
>
<h2><a href="#publishing-to-github">Publishing To GitHub</a></h2>

1. Create a GitHub repository for this tutorial in the GitHub Organization that you created for this purpose. I'll assume that this repository has the address: ${'`'}https://${organization}.github.com/${name}${'`'}
2. On your development computer, use ${'`'}git remote add origin git@github.com:${organization}/${name}.git${'`'} to connect this local repository with the remote GitHub repository
3. Use ${'`'}git push -u origin main${'`'} to push the Initial Commit of this local repository to your remote GitHub repository.
4. Open the Settings tab in your remote GitHub repository page.
5. In the Code and automation section in the left column, choose Pages
6. In the Build and Deployment section of the Pages page, choose the ${'`'}main${'`'} branch and the ${'`'}docs/${'`'} folder and click Save to publish the site stored in the ${'`'}docs/${'`'} folder.

Your tutorial will be published at a URL like [https://${organization}.github.io/${name}](). It may take a few minutes before your site goes live.

<details
class="pivot"
open
>
<summary>From Boilerplate to Personal Content</summary>
If all goes well, you should now find a short tutorial (that you did not write yourself) available for the world to see. Now the real work begins: working efficiently to write your own content.

</details>
</section>
EOF`
    },

    { file: `${fullPath}/docs/md/02-Personal-Content.md`,
      cat: `touch %file && cat > %file <<'EOF'
<section
id="personal-content"
aria-labelledby="personal-content"
data-item="Personal Content"
>
<h2><a href="#personal-content">Personal Content</a></h2>

The content for this tutorial is stored in Markdown files inside the folder ${'`'}docs/md/${'`'}. Edit these files and add to them to structure your tutorial.

To convert these files to a single HTML file at ${'`'}doc/index.html${'`'}, you need to run the command ${'`'}npm run pandoc${'`'}. This was already done for you after you ran the command ${'`'}npm run demo${'`'} which created this demo tutorial.

<details
class="note"
open
>
<summary>Pandoc</summary>
[Pandoc](https://pandoc.org/) is a free-software document converter, which can convert documents between around 60 different file formats. The languages used to write and extend it are Haskel, Lua and Python. A NodeJS module called ${'`'}pandoc${'`'} allows you to access its power through JavaScript.

</details>

## Watching for changes to the ${'`'}docs/md/${'`'} files

Before you start editing or adding to the files in ${'`'}docs/md/${'`'}, you can run the command ${'`'}npm run watch${'`'} in a Terminal window open at the root of this directory. This will start the ${'`'}fb-watchman${'`'} node module, which will run ${'`'}npm run pandoc${'`'} automatically for you:

* Whenever you save a modified ${'`'}.md${'`'} file
* Whenever you add a new ${'`'}.md${'`'} file to ${'`'}docs/md/${'`'}
* Whenever you delete or rename an existing ${'`'}.md${'`'} file.

<details
class="env"
open
>
<summary>Viewing with Live Server</summary>
If you are working with Virtual Studio Code, you can install the extension [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer), and use this to serve the page at ${'`'}docs/index.html${'`'}. This will allow you to view the actual HTML output from your Markdown files in real time as you edit.

</details>
</section>
EOF`
    },
    {file: `${fullPath}/docs/md/03-Organizing-Your-Writing.md`,
      cat: `touch %file && cat > %file <<'EOF'
<section
  id="organizing-your-writing"
  aria-labelledby="organizing-your-writing"
  data-item="Organizing Your Writing"
>
  <h2><a href="#organizing-your-writing">Organizing Your Writing</a></h2>

1. You are now ready to start writing your tutorial in Markdown files in the ${'`'}docs/md/${'`'} folder.
2. Use zero-padded numbering for your ${'`'}.md${'`'} files (e.g.: "01-Getting-Started.md", "02-First-steps.md", ...) to ensure that they are loaded in the correct order.
3. For reasons associated with CSS sibling management, the very _first_ ${'`'}.md${'`'} file should have the _highest_ initial number. That's why the text for ${'`'}99-Intro.md${'`'} appears first. All other files should be numbered in the usual way.
4. Use the root of your new repository to contain the code and assets that demonstrate the finished version of your tutorial
5. Push your repository to GitHub when the tutorial is ready to share.

## Where to go from here

This four-part tutorial is intended only to provide a demo of how the HTM-Elves workflow can simplify your life. For in-depth information on how to use shortcuts, keybindings and other time-saving techniques, visit the more detailed tutorials on the [HTM-Elves website](https://HTM-Elves.github.io).

***Have fun!***

</section>
EOF`
    }
  ]} else {
    mdFiles = [
      { file: `${fullPath}/docs/md/99-Intro.md`,
        cat: `touch %file && cat > %file <<'EOF'
---
title: ${name}
subtitle: (set subtitle in 99-Intro.md, if required)
month: ${month}
organization: ${organization}
repo: ${name}
---
<section
  id="intro"
  aria-labelledby="intro"
  data-item="Introduction"
>
  <h2><a href="#intro">Introduction</a></h2>

To create your own content, edit the file at ${'`'}docs/md/99-Intro.md${'`'} and add more ${'`'}.md${'`'} files in the ${'`'}docs/md/${'`'} folder.

See [Writing Your Own Tutorials](https://htm-elves.github.io/Writing-Your-Own-Tutorials/) for tips and shortcuts.

</section>
EOF`
      }
    ]
  }

  mdFiles.forEach(({ file, cat }) => {
    cat = cat.replaceAll("%file", file)
    exec(cat, (error, stdout, stderr) => {
      if (error) {
        // console.log(`Markdown files error: ${error.message}`)
        // process.exit()
      } else if (stderr) {
        console.log(`Markdown files stderr: ${stderr}`)
        process.exit()
      }
    })
  })


  // console.log(`npm run pandoc; CONVERT md TO doc/index.html`)
  exec(`cd ${fullPath} && npm run pandoc`, (error, stdout, stderr) => {
    if (error) {
      console.log(`run pandoc error: ${error.message}`)
      process.exit()

    } else if (stderr) {
      console.log(`run pandoc stderr: ${stderr}`)
      process.exit()
    }


    // console.log("ADD README")
    let readme
    const md = `${fullPath}/README.md`
    if (isDemo) {
      readme = `touch ${md} && cat > ${md} <<'EOF'
# Tutorial Template #

The command ${'`'}npm run demo${'`'} creates this new demo tutorial repository. Initially it contains the following folders, files and symlinks:
${'```'}
.
├── README.md
├── docs
│   ├── images
│   ├── index.html
│   └── md
│       ├── 01-Publishing-to-GitHub.md
│       ├── 02-Personal-Content.md
│       ├── 03-Organizing-Your-Writing.md
│       ├── 99-Introduction.md
│       └── images -> ../images
├── package.json
└── public -> ../${organization}/public
${'```'}

If the installation is successful, the file at ${'`'}docs/index.html${'`'} will have been generated automatically from the files in ${'`'}docs/md/${'`'}, and displayed in your favourite browser.

## Writing the content of your tutorial

You can now add new Markdown files to the ${'`'}docs/md/${'`'} folder and edit the existing ones.

To regenerate ${'`'}docs/index.html${'`'}, you can run ${'`'}npm run pandoc${'`'} in the Terminal. A better solution is to run ${'`'}npm run watch${'`'} in the Terminal. This will start the ${'`'}watchman${'`'} node module, and this will call ${'`'}npm run pandoc${'`'} for you automatically each time you save a changed Markdown file, delete one, or create a new one.

**NOTE: You need to [install Watchman](https://facebook.github.io/watchman/docs/install) before this will work.**

To see the updated ${'`'}docs/index.html${'`'} in your browser, you can run VS Code's [Live Server extension](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer).

## Publishing your tutorial

To publish your tutorial on GitHub, you need to:

1. Create a GitHub repository for this tutorial in the GitHub Organization that you created for this purpose.
2. Commit your changes locally and push them to the remote GitHub repository.
3. Open the Settings tab in your remote GitHub repository.
4. In the Code and automation section in the left column, choose Pages
5. In the Build and Deployment section of the Pages page, choose the ${'`'}main${'`'} branch and the ${'`'}docs/${'`'} folder and click Save to publish the site stored in the ${'`'}docs/${'`'} folder.

Assuming that your GitHub Organization is called ${'`'}MyOrganization${'`'}, and your tutorial repository is called ${'`'}MyTutorial${'`'}, your tutorial will be published at [https://MyOrganization.github.io/MyTutorial](). It may take a few minutes before your site goes live.

Because your tutorial repository is a child of your GitHub organization, the file at ${'`'}docs/index.html${'`'} is able to access files at [https://MyOrganization.github.io/public](). As a result, all your tutorials will have the same look and feel.

In the future, to update your tutorial, simply commit your changes and push them to the GitHub repository.

## Writing efficiently

Publishing and updating your tutorial takes only a fraction of the time that it takes to write a good tutorial. Check out the articles on [the HTM-Eleves site](https://HTM-Elves.github.io), for ideas on how to use shortcuts, keybindings and other time-saving tricks so that you can focus on writing, not on typing.

## Providing material to accompany your tutorial

You can use this repository, just like any other, to share working code and assets associated with your tutorial. Developers who clone your repository will be able to read the tutorial at ${'`'}docs/index.html${'`'} locally, while reviewing and testing your code examples.

## Recycle the README

And don't forget to replace the contents of this README with a meaningful description of your own project and its tutorial, so that GitHub users will be able to find the work that you are sharing.

All the best!
EOF`
    } else {
      readme = `touch ${md} && cat > ${md} <<'EOF'
# ${name} #

To create your own content, edit the file at ${'`'}docs/md/99-Intro.md${'`'} and add more ${'`'}.md${'`'} files in the ${'`'}docs/md/${'`'} folder
${'```'}
.
├── README.md
├── docs
│   ├── images
│   ├── index.html
│   └── md
│       ├── 99-Intro.md
│       └── images -> ../images
├── package.json
└── public -> ../${organization}/public
${'```'}

Visit [the HTM-Elves Organization site](https://HTM-Elves.github.io) for tutorials on how to work with the HTM-Elves workflow.

Replace the contents of this README.md file with a summary of the tutorial that you are writing.
`
    }
    exec(readme, (error, stdout, stderr) => {
      if (error) {
        console.log(`README error: ${error.message}`)
        process.exit()
      } else if (stderr) {
        console.log(`README stderr: ${stderr}`)
        process.exit()
      }
    })


    // console.log(`MAKE FIRST COMMIT`)
    const commit = `cd ${fullPath} && git add . && git commit -m "Initial commit"`
    exec(commit, (error, stdout, stderr) => {
      if (error) {
        console.log(`First commit error: ${error.message}`)
        process.exit()
      } else if (stderr) {
        console.log(`First commit stderr: ${stderr}`)
        process.exit()
      }
      // console.log("stdout:", stdout)
      // Initial commit: 5 files changed, 145 insertions(+)...

      // console.log(`CREATE GITHUB REPOSITORY?`)
      // https://docs.github.com/en/rest/repos/repos?apiVersion=2022-11-28#create-an-organization-repository
      if (GITHUB_TOKEN) {
        const headers = {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
        }

        const body = JSON.stringify({
          name,
          description: '',
          homepage: `https://${organization}.github.io/${name}`,
          private: false,
          has_issues: true,
          has_projects: true,
          has_wiki: true,
        })

        fetch(`https://api.github.com/orgs/${organization}/repos`, {
          method: 'POST',
          headers,
          body,
        })
          .then(response => response.json())
          .then(addRemoteAndPush)
          .catch(error => console.error(
            'Create GitHub Repository Error:',
            error
          ));


        function addRemoteAndPush(data) {
          // console.log(`ADD REMOTE origin`)
          const { status, message, ssh_url } = data
          if (message) {
            return console.log(
              `CREATE GITHUB REPOSITORY FAILED
              status: ${status}
              message: ${message}
              `
            )
          }

          const addRemote = `cd ${fullPath} && git remote add origin ${ssh_url}`
          exec(addRemote, (error, stdout, stderr) => {
            if (error) {
              console.log(`Add remote error: ${error.message}`)
              return
            } else if (stderr) {
              console.log(`Add remote stderr: ${stderr}`)
              return
            }

            // console.log(`git push -u origin main`)
            const push = `cd ${fullPath} && git push -u origin main`
            exec(push, (error, stdout, stderr) => {
              if (error) {
                console.log(`push error: ${error.message}`)
                return
              } else if (stderr) {
                // console.log(`push stderr: ${stderr}`)
                // return
              }
              console.log(stdout)
            })
          })
        }
      }
    })



    // console.log("OPEN THE CONVERTED index.html IN BROWSER")
    const url = `${fullPath}/docs/index.html`
    const start = (process.platform == 'darwin'
      ? 'open'
      : ( process.platform == 'win32'
          ? 'start'
          : 'xdg-open'
      )
    );
    exec(start + ' ' + url);
  })
}
