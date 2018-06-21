/* global plugin Firebase */

plugin
  .controller('wgnCntl', ['$scope', '$routeParams', 'znData', '$firebase', function ($scope, $routeParams, znData, $firebase) {
    $scope.loading = true
    $scope.newMessage = ''
    $scope.selectedMemberId = null
    $scope.conversations = {}
    $scope.messages = []

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
      console.log($scope.messages)
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
          var conversation = id > $scope.me.id ? id + '-' + $scope.me.id : $scope.me.id + '-' + id
          conversations[conversation] = $firebase(new Firebase($scope.plugin.firebaseUrl + '/rooms/' + $routeParams.workspace_id + '/conversations/' + conversation).child('/messages')).$asArray()
          conversations[conversation].$watch(function (event) {
            $scope.$emit('chatAutoscroll')
          })
          return conversations
        }, {})

        console.log($scope.conversations)

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

// 02b91bb527313bbcca7cd1b6c103546c15d0b375
