const chokidar = require('chokidar')
const { exec } = require('child_process')

const maya = chokidar.watch([
  './plugins/z-chat-plugin/src/**.*',
  './plugins/z-chat-plugin/plugin-register.js',
  './maya.json'
])

maya.on('change', (path) => {
  console.log('redeploying')
  exec('docker run -i --rm -v $(pwd):/usr/src/plugin-repo -v $HOME/.ssh:/root/.ssh --name maya-running maya deploy', { shell: '/bin/zsh' }, (err) => {
    if (err) console.error(err)
    else console.log('Successfully Deployed at', new Date().toLocaleString())
  })
})