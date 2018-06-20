/* global plugin Firebase */

plugin.controller('wgnCntl', ['$scope', '$routeParams', 'znData', '$firebase', function ($scope, $routeParams, znData, $firebase) {
  $scope.loading = true

  $scope.newMessage = ''

  $scope.getUserById = function (id) {
    return this.members.find(function (m) {
      return m.user.id === id
    }).user
  }

  $scope.onType = function (event) {
    var text = event.target
    text.style.height = 'auto'
    text.style.height = text.scrollHeight + 'px'
  }

  znData('WorkspaceMembers').query(
    // Params
    {
      workspaceId: $routeParams.workspace_id
    },
    // Success
    function (resp) {
      $scope.members = resp
    },
    // Error
    function (resp) {
      $scope.err = resp
    }
  )

  znData('Plugins').get(
    {
      namespace: 'zchat'
    },
    function (resp) {
      $scope.plugin = resp[0]
    },
    function (resp) {
      $scope.err = resp
    }
  )

  znData('Users').get(
    {
      id: 'me'
    },
    function (resp) {
      $scope.me = resp
    },
    function (resp) {
      $scope.err = resp
    }
  )

  var unbindInitialDataFetch = $scope.$watchCollection('[members, plugin, me]', function () {
    if ($scope.err) {
      $scope.loading = false
      unbindInitialDataFetch()
      return
    }

    if ($scope.members !== undefined && $scope.plugin !== undefined && $scope.me !== undefined) {
      unbindInitialDataFetch()
      $scope.loading = false
      $scope.messages = [
        {
          userId: 40445,
          message: 'Hey there!'
        },
        {
          userId: 1,
          message: 'Well, hey!'
        }
      ]
      $scope.connect()
    }
  })

  $scope.connect = function () {
    var ref = new Firebase($scope.plugin.firebaseUrl + '/rooms/' + $routeParams.workspace_id)

    ref.auth($scope.plugin.firebaseAuthToken, function (err, res) {
      if (err) {
        $scope.err = err
        $scope.$apply()
        return
      }
      var session = new Firebase($scope.plugin.firebaseUrl + '/rooms/' + $routeParams.workspace_id + '/sessions/' + $scope.me.id)
      var connection = new Firebase($scope.plugin.firebaseUrl + '/.info/connected')

      connection.on('value', function (snapshot) {
        if (snapshot.val() === true) {
          session.set(true)

          session.onDisconnect().remove()
        }
      })

      // Remove the user from the active sessions list when the plugin is closed
      $scope.$on('$destroy', function () {
        session.remove()
      })

      // Set sessions
      $scope.sessions = $firebase(ref.child('sessions')).$asObject()

      // Set messages
      $scope.messages = $firebase(ref.child('/messages'))
        .$asArray()
        .$watch(function (event) {
          $scope.$emit('chatAutoscroll')
        })

      // Set loading
      $scope.loading = false

      // Apply changes to the scope
      $scope.$apply()
    })
  }

  $scope.addMessage = function () {
    if ($scope.newMessage === '') return

    $scope.messages.$add({
      userId: $scope.me.id,
      message: $scope.newMessage,
      timestamp: Firebase.ServerValue.TIMESTAMP
    })

    $scope.newMessage = ''

    document.querySelector('#text').focus() // Hey, it works.
  }
}])

  /**
   * Plugin z-chat Settings Controller
   */
  .controller('wgnSettingsCntl', ['$scope', function ($scope) {
    $scope.text = 'Settings'
  }])
  .directive('wgnChatAutoscroll', ['$timeout', function ($timeout) {
    return {
      link: function postLink (scope, element, attrs) {
        scope.$on('chatAutoscroll', function () {
          $timeout(function () {
            element.scrollTop(element[0].scrollHeight)
            console.log(element)
          })
        })
      }
    }
  }])
