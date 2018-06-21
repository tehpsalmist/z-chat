/* global plugin Firebase */

plugin
  .controller('wgnCntl', ['$scope', '$routeParams', 'znData', '$firebase', '$location', 'znFiltersPanel', function ($scope, $routeParams, znData, $firebase, $location, znFiltersPanel) {
    $scope.loading = true
    $scope.newMessage = ''
    $scope.selectedMemberId = null
    $scope.conversations = {}
    $scope.messages = []
    $scope.showMembers = true

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

    $scope.notUser = function (member, index, members) {
      if ($scope.me) return member.user.id !== $scope.me.id
      else return true
    }

    $scope.selectMember = function (id) {
      $scope.selectedMemberId = id
      var conversationId = $scope.selectedMemberId > $scope.me.id
        ? $scope.selectedMemberId + '-' + $scope.me.id
        : $scope.me.id + '-' + $scope.selectedMemberId

      $scope.messages = $scope.conversations[conversationId]
      $scope.showMembers = false
      $scope.$emit('chatAutoscroll')
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

    $scope.searchForms = function () {

    }

    $scope.searchFiles = function () {

    }

    $scope.attachRecord = function () {

    }

    // $location.search('file-viewer', 1096679)

    var unbindInitialDataFetch = $scope.$watchCollection('[members, plugin, me]', function () {
      if ($scope.err) {
        $scope.loading = false
        unbindInitialDataFetch()
        return
      }

      if ($scope.members !== undefined && $scope.plugin !== undefined && $scope.me !== undefined) {
        unbindInitialDataFetch()
        $scope.loading = false
        $scope.connect()
      }
    })

    $scope.connect = function () {
      var room = new Firebase($scope.plugin.firebaseUrl + '/rooms/' + $routeParams.workspace_id)

      room.auth($scope.plugin.firebaseAuthToken, function (err, res) {
        if (err) {
          $scope.err = err
          $scope.$apply()
          return
        }
        var session = new Firebase($scope.plugin.firebaseUrl + '/rooms/' + $routeParams.workspace_id + '/sessions/' + $scope.me.id)
        var connection = new Firebase($scope.plugin.firebaseUrl + '/.info/connected')

        $scope.conversations = $scope.members.reduce(function (conversations, member) {
          var id = member.user.id

          if (id === $scope.me.id) return conversations

          var conversationId = id > $scope.me.id ? id + '-' + $scope.me.id : $scope.me.id + '-' + id

          conversations[conversationId] = $firebase(new Firebase($scope.plugin.firebaseUrl + '/rooms/' + $routeParams.workspace_id + '/conversations/' + conversationId).child('/messages')).$asArray()
          conversations[conversationId]
            .$watch(function (event) {
              $scope.$emit('chatAutoscroll')
            })
          return conversations
        }, {})

        connection.on('value', function (snapshot) {
          if (snapshot.val() === true) {
            session.set(true)

            session.onDisconnect().remove()
          }
        })

        $scope.$on('$destroy', function () {
          session.remove()
        })

        $scope.sessions = $firebase(room.child('sessions')).$asObject()

        $scope.loading = false
        $scope.$apply()
        // $location.search('record', '62472.3595816')
        // $location.search('tab', 'plugin.zChat')
        // $location.search('member', 1)
      })
    }

    $scope.addMessage = function () {
      if ($scope.newMessage === '') return

      $scope.messages.$add({
        userId: $scope.me.id,
        message: $scope.newMessage,
        timestamp: Firebase.ServerValue.TIMESTAMP,
        read: false
      })

      $scope.newMessage = ''

      document.querySelector('#text').focus()
      if (document.querySelector('#record-text')) document.querySelector('#record-text').focus()
    }
  }])
  .controller('wgnSettingsCntl', ['$scope', function ($scope) {
    $scope.text = 'Settings'
  }])
  .directive('wgnChatAutoscroll', ['$timeout', function ($timeout) {
    return {
      link: function postLink (scope, element, attrs) {
        scope.$on('chatAutoscroll', function () {
          $timeout(function () {
            element.scrollTop(element[0].scrollHeight)
          })
        })
      }
    }
  }])
