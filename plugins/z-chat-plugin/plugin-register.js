
/**
 * Plugin Registration
 */
plugin.register('wgn', {
  route: '{replace-route}',
  title: 'Z-Chat',
  icon: 'icon-chat',
  interfaces: [
    {
      controller: 'wgnCntl',
      template: 'wgn-main',
      type: 'fullPage',
      order: 300,
      topNav: true
    },
    {
      controller: 'wgnSettingsCntl',
      template: 'wgn-settings',
      type: 'settings'
    }
  ]
})
