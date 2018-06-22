/* global plugin Firebase */

plugin
  .controller(
    'wgnCntl',
    [
      '$scope',
      '$routeParams',
      'znData',
      '$firebase',
      '$location',
      'znFiltersPanel',
      '$q',
      '$timeout',
      function ($scope, $routeParams, znData, $firebase, $location, znFiltersPanel, $q, $timeout) {
        // *** Scope Variables ***

        $scope.loading = true
        $scope.newMessage = ''
        $scope.selectedMemberId = null
        $scope.conversations = {}
        $scope.messages = []
        $scope.showMembers = true
        $scope.searchPhrase = ''

        // *** View Manipulation Methods ***

        $scope.getUserById = function (id) {
          return this.members.find(function (m) {
            return m.user.id === id
          }).user
        }

        $scope.notUser = function (member, index, members) {
          if ($scope.me) return member.user.id !== $scope.me.id
          else return true
        }

        $scope.onType = function (event) {
          var text = event.target
          text.style.height = 'auto'
          text.style.height = text.scrollHeight + 'px'
        }

        $scope.focusOnChat = function () {
          $timeout(function () {
            if (document.querySelector('#text')) document.querySelector('#text').focus()
            if (document.querySelector('#record-text')) document.querySelector('#record-text').focus()
          })
        }

        // *** Method for Selecting Member ***

        $scope.selectMember = function (id) {
          $scope.selectedMemberId = id
          var conversationId = $scope.selectedMemberId > $scope.me.id
            ? $scope.selectedMemberId + '-' + $scope.me.id
            : $scope.me.id + '-' + $scope.selectedMemberId

          $scope.messages = $scope.conversations[conversationId]
          $scope.showMembers = false
          $scope.$emit('chatAutoscroll')
          $scope.focusOnChat()
        }

        // *** Message Sending Methods ***

        $scope.addMessage = function () {
          if ($scope.newMessage === '') return

          $scope.messages.$add({
            userId: $scope.me.id,
            message: $scope.newMessage,
            timestamp: Firebase.ServerValue.TIMESTAMP,
            read: false
          })

          $scope.newMessage = ''

          $scope.focusOnChat()
        }

        $scope.toggleSearch = function (type) {
          $scope.searchPhrase = ''
          if (type === 'records') {
            $scope.searchBar = true
            $scope.searchFiles = false
            $scope.searchRecords = true
            $timeout(function () { document.querySelector('#search-records').focus() })
          } else if (type === 'files') {
            $scope.searchBar = true
            $scope.searchFiles = true
            $scope.searchRecords = false
            $timeout(function () { document.querySelector('#search-files').focus() })
          } else {
            $scope.searchBar = false
            $scope.searchFiles = false
            $scope.searchRecords = false
          }
        }

        $scope.selectFile = function ($item) {
          var id = $item.type === 'doc' ? $item.id : 'file.' + $item.id

          $scope.messages.$add({
            userId: $scope.me.id,
            message: null,
            file: $item.type === 'doc' ? id : null,
            image: $item.type === 'img' ? id : null,
            name: $item.name + '.' + $item.extension,
            timestamp: Firebase.ServerValue.TIMESTAMP,
            read: false
          })
          $scope.focusOnChat()
        }

        $scope.selectRecord = function ($item) {
          $scope.attachRecord($item.folder.form.id + '.' + $item.id)
        }

        $scope.attachRecord = function (recordIdString) {
          $scope.messages.$add({
            userId: $scope.me.id,
            message: null,
            record: recordIdString || $routeParams.record,
            timestamp: Firebase.ServerValue.TIMESTAMP,
            read: false
          })
          $scope.focusOnChat()
        }

        // *** Link Opening Methods ***

        $scope.visitRecord = function (record) {
          $location.search('record', record)
          $location.search('tab', 'plugin.zChat')
          $location.search('member', $scope.selectedMemberId)
        }

        $scope.openImage = function (imageId) {
          $location.search('lightbox', imageId)
        }

        $scope.viewFile = function (fileId) {
          $location.search('file-viewer', fileId)
        }

        // *** Initial Data Retrieval ***

        znData('WorkspaceMembers').query(
          { workspaceId: $routeParams.workspace_id },
          function (resp) { $scope.members = resp },
          function (resp) { $scope.err = resp }
        )

        znData('Plugins').get(
          { namespace: 'zchat' },
          function (resp) { $scope.plugin = resp[0] },
          function (resp) { $scope.err = resp }
        )

        znData('Users').get(
          { id: 'me' },
          function (resp) { $scope.me = resp },
          function (resp) { $scope.err = resp }
        )

        znData('Forms').get(
          {},
          function (forms) {
            $scope.forms = forms

            var promises = []
            function getRecords (form) {
              var defer = $q.defer()
              znData('FormRecords').get(
                { formId: form.id },
                function (records) { defer.resolve(records) },
                function (error) { defer.reject(error) }
              )
              return defer.promise
            }
            forms.forEach(function (form) {
              promises.push(getRecords(form))
            })
            $q.all(promises).then(function (results) {
              $scope.records = results.reduce(function (allRecords, recordList) {
                return allRecords.concat(recordList)
              }, [])
            }, function (error) {
              console.log(error)
            })
          },
          function (error) { console.error(error) }
        )

        znData('Files').get(
          {},
          function (files) { $scope.files = files },
          function (error) { console.log(error) }
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

        // *** Establishing Firebase Connection ***

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

            $routeParams.member && $scope.selectMember($routeParams.member)

            $scope.loading = false
            $scope.$apply()
          })
        }
      }
    ]
  )
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
  .filter('wgnAsyncConvertRecordToName', ['znData', function (znData) {
    var loading = false
    var recordNames = {}
    var errors = 0

    function getRecordName (formRecord) {
      var currentName = formRecord
      if (recordNames[formRecord]) {
        currentName = recordNames[formRecord]
      } else if (loading === false && recordNames[formRecord] === undefined) {
        loading = true
        znData('FormRecords')
          .get(
            { formId: formRecord.split('.')[0], id: formRecord.split('.')[1] },
            function (recordInfo) {
              recordNames[formRecord] = recordInfo.name
              loading = false
              errors = 0
            },
            function (error) {
              console.error(error)
              loading = false
              errors++
              if (errors > 3) recordNames[formRecord] = formRecord
            }
          )
      }
      return currentName
    }
    return getRecordName
  }])
