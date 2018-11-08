
/* global plugin */
plugin.register('wgn', {
  route: '{replace-route}',
  title: 'ZenChat',
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
      controller: 'wgnCntl',
      template: 'wgn-record',
      type: 'recordOverlay',
      order: 200
    },
    {
      controller: 'wgnSettingsCntl',
      template: 'wgn-settings',
      type: 'settings'
    }
  ]
})
