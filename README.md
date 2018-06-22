# Z-Chat
#### A Zengine Plugin for one-on-one conversations and file-sharing among workspace members

## Developing with Maya

When using [Maya](https://github.com/ZengineHQ/maya) to develop this plugin (or any zengine plugin, for that matter), there is a script included in this project (chokidar.js) that will watch the relevant files and auto-deploy on changes. To use this feature,

1. `npm install`

2. You will likely need to adjust the _second argument_ of the exec function at line 12 to match your local shell.

    (fun fact: `child_process.exec` can't execute aliases)

3. `npm start`