(function () {

  class Comments {
    constructor(scope) {
      this.scope = scope;
      this.model = this.scope.$parent.model;

      this.scope.$parent.$watch('recordId', key => {
        this.items = null;
        this.scope.loading = Katrid.i18n.gettext('Loading...');
        clearTimeout(this._pendingOperation);
        this._pendingOperation = setTimeout(() => {
          this._pendingOperation = null;
          this.masterChanged(key);
          return this.scope.$apply(() => {
            return this.scope.loading = null;
          });
        }
        , 1000);
      });

      this.items = [];
    }

    async masterChanged(key) {
      if (key) {
        const svc = new Katrid.Services.Model('mail.message');
        if (this.scope.$parent.record)
        return svc.post('get_messages', { args: [this.scope.$parent.record.messages] })
        .then(res => {
          this.items = res;
          this.scope.$apply();
        });
      }
    }

    async _sendMesage(msg, attachments) {
      if (attachments)
        attachments = attachments.map((obj) => obj.id);
      let msgs = await this.model.post('post_message', { args: [[this.scope.$parent.recordId]], kwargs: { content: msg, content_subtype: 'html', format: true, attachments: attachments } });
      this.scope.message = '';
      this.items = msgs.concat(this.items);
      this.scope.$apply();
      this.scope.files = null;
      this.scope.hideEditor();
    }

    postMessage(msg) {
      if (this.scope.files.length) {
        let files = [];
        for (let f of this.scope.files) files.push(f.file);
        var me = this;
        Katrid.Services.Attachments.upload({files: files}, this.scope)
        .done((res) => {
          me._sendMesage(msg, res);
        });
      } else
        this._sendMesage(msg);
    }
  }


  Katrid.UI.uiKatrid.directive('comments', () =>
    ({
      restrict: 'E',
      scope: {},
      replace: true,
      template: '<div class="content"><div class="comments"><mail-comments/></div></div>',
      link(scope, element, attrs) {
        if (element.closest('.modal-dialog').length)
          element.remove();
        else
          $(element).closest('.form-view[ng-form=form]').children('.content:first').append(element);
      }
    })
  );

  Katrid.UI.uiKatrid.directive('mailComments', () =>
    ({
      restrict: 'E',
      controller: ['$scope', ($scope) => {
        $scope.comments = new Comments($scope);
        $scope.files = [];

        $scope.showEditor = () => {
          $($scope.el).find('#mail-editor').show();
          $($scope.el).find('#mail-msgEditor').focus();
        };

        $scope.hideEditor = () => {
          $($scope.el).find('#mail-editor').hide();
        };

        $scope.attachFile = (file) => {
          for (let f of file.files)
            $scope.files.push({
              name: f.name,
              type: f.type,
              file: f
            });
          $scope.$apply();
        };

        $scope.deleteFile = (idx) => {
          $scope.files.splice(idx, 1);
        }
      }],
      replace: true,
      link(scope, element, attrs) {
        scope.el = element;
      },

      template() {
        return `
  <div class="container">
          <h3>${Katrid.i18n.gettext('Comments')}</h3>
          <div class="form-group">
          <button class="btn btn-outline-secondary" ng-click="showEditor();">${Katrid.i18n.gettext('New message')}</button>
          <button class="btn btn-outline-secondary">${Katrid.i18n.gettext('Log an internal note')}</button>
          </div>
          <div id="mail-editor" style="display: none;">
            <div class="form-group">
              <textarea id="mail-msgEditor" class="form-control" ng-model="message"></textarea>
            </div>
            <div class="form-group">
              <button class="btn btn-default" type="button" onclick="$(this).next().click()"><i class="fa fa-paperclip"></i></button>
              <input class="input-file-hidden" type="file" multiple onchange="angular.element(this).scope().attachFile(this)">
            </div>
            <div class="form-group" ng-show="files.length">
              <ul class="list-inline attachments-area">
                <li ng-repeat="file in files" ng-click="deleteFile($index)" title="${ Katrid.i18n.gettext('Delete this attachment') }">{{ file.name }}</li>
              </ul>
            </div>
            <div class="from-group">
              <button class="btn btn-primary" ng-click="comments.postMessage(message)">${Katrid.i18n.gettext('Send')}</button>
            </div>
          </div>
  
          <hr>
  
          <div ng-show="loading">{{ loading }}</div>
          <div class="comment media col-sm-12" ng-repeat="comment in comments.items">
            <div class="media-left">
              <img src="/static/web/assets/img/avatar.png" class="avatar rounded">
            </div>
            <div class="media-body">
              <strong>{{ ::comment.author_name }}</strong> - <span class="timestamp text-muted" title="$\{ ::comment.date_time|moment:'LLLL'}"> {{::comment.date_time|moment}}</span>
              <div class="clearfix"></div>
              <div class="form-group">
                {{::comment.content}}
              </div>
              <div class="form-group" ng-if="comment.attachments">
                <ul class="list-inline">
                  <li ng-repeat="file in comment.attachments"><a href="/web/content/$\{ ::file.id }/?download">{{ ::file.name }}</a></li>
                </ul>
              </div>
            </div>
          </div>
    </div>`;
      }
    })
  );


  class MailFollowers {}


  class MailComments extends Katrid.UI.Widgets.Widget {
    static initClass() {
      this.prototype.tag = 'mail-comments';
    }

    spanTemplate(scope, el, attrs, field) {
      return '';
    }
  }
  MailComments.initClass();


  Katrid.UI.Widgets.MailComments = MailComments;

})();
