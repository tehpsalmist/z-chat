# Z-Chat
#### A Zengine Plugin for one-on-one conversations and file-sharing among workspace members

## Developing with Maya

When using Maya to develop on this plugin, there is a script included (chokidar.js) that will watch the relevant files and auto-deploy on changes. To run,

1. `npm install`

2. You will likely need to adjust the _second argument_ of the exec function at line 12 to match your local shell.
    (fun fact: `child_process.exec` can't execute aliases)

3. `npm start`