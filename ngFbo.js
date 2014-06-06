'use strict';

angular.module('ngFbo', [], function ($compileProvider) {
  $compileProvider.directive('fboNotifier', function ($parse) {
    var Mode = {
        SHALLOW: 'shallow',
        DEEP: 'deep',
        COLLECTION: 'collection'
      },
      DEFAULT_MODE = Mode.SHALLOW;

    return {
      scope: true,
      controller: function () {
        var eventName, callbacks = [];
        this.setEventName = function (name) {
          // set event name and return to subjects
          eventName = name;
          angular.forEach(callbacks, function (callback) {
            callback(name);
          });
        };
        this.getEventName = function (callback) {
          // register or return the event name to the subjects
          if (eventName) {
            callback(eventName);
          } else {
            callbacks.push(callback);
          }
        };
      },
      compile: function compile(element, attrs) {
        var expr = $parse(attrs.fboNotifier),
          name = attrs.fboNotifier + '::watcher',
          mode = attrs.mode || DEFAULT_MODE;

        return function link(scope, element, attrs, ctrl) {
          function watchHandler(newValue, oldValue, scope) {
            scope.$broadcast(name, newValue, oldValue);
          }
          // send event name to subjects
          ctrl.setEventName(name);
          switch (mode) {
          case Mode.SHALLOW:
          case Mode.DEEP:
            scope.$watch(expr, watchHandler, mode === Mode.DEEP);
            break;
          case Mode.COLLECTION:
            scope.$watchCollection(expr, watchHandler);
            break;
          }
        };
      }
    };
  });
  $compileProvider.directive('fboParse', function ($parse) {
    return {
      require: '?^fboNotifier',
      compile: function (element, attrs) {
        var value = attrs.fboParse,
          expressions = {},
          regExp = new RegExp(/\{(.*?)\}/g),
          match = regExp.exec(value),
          force = attrs.force !== undefined,
          attr = attrs.prop || 'text';

        while (match) {
          expressions[match[0]] = $parse(match[1]);
          match = regExp.exec(value);
        }
        return function link(scope, element, attrs, notifier) {
          var unbinds = {};
          function replace() {
            var newValue = value;
            angular.forEach(expressions, function (expression, key) {
              // evaluate all expressions, if undefined then replace with empty string
              var evaluated = expression(scope);
              if (evaluated !== undefined) {
                newValue = value.replace(key, evaluated);
              } else {
                newValue = value.replace(key, '');
              }
            });
            // for now only attrs & text are supported, for extra functionality add cases to the switch
            switch (attr) {
            case 'text':
              element.text(newValue);
              break;
            default:
              element.attr(attr, newValue);
              break;
            }
          }

          // wait for the evaluated expression to be !undefined and then "unwatch" it
          function watchHandler(newValue, key) {
            if (newValue !== undefined) {
              unbinds[key]();
              delete unbinds[key];
              replace();
            }
          }

          // if force attribute exists then just replace with available data
          if (force) {
            replace();
          } else {
            // wait for the values to be different from undefined before unbinding them
            angular.forEach(expressions, function (expression, key) {
              unbinds[key] = scope.$watch(expression, function (newValue) {
                watchHandler(newValue, key);
              });
            });
          }

          // if notifier exists
          if (notifier) {
            notifier.getEventName(function (name) {
              scope.$on(name, replace);
            });
          }
        };
      }
    };
  });
  $compileProvider.directive('fboBindHtml', function ($parse, $compile) {
    return {
      require: '?^fboNotifier',
      compile: function compile(element, attrs) {
        var expr = $parse(attrs.fboBindHtml),
          force = attrs.force !== undefined;
        return function link(scope, element, attrs, notifier) {
          var unbinds = angular.noop;

          function replace() {
            var rawHtml = expr(scope), html;
            try {
              html = angular.element(rawHtml);
            } catch (e) {
              // if the html can vary to text
              html = angular.element('<span>' + rawHtml + '</span>');
            }
            $compile(html, scope)(scope, function (html) {
              element.empty().append(html);
            });

          }
          function watchHandler(newValue) {
            if (newValue !== undefined) {
              unbinds();
              replace();
            }
          }
          if (force) {
            replace();
          } else {
            unbinds = scope.$watch(expr, function (newValue) {
              watchHandler(newValue);
            });
          }
          if (notifier) {
            notifier.getEventName(function (name) {
              scope.$on(name, replace);
            });
          }
        };
      }
    };
  });
  $compileProvider.directive('fboClass', function ($parse) {
    return {
      require: '?^fboNotifier',
      compile: function compile(element, attrs) {
        var expr = $parse(attrs.fboClass),
          force = attrs.force !== undefined;
        return function link(scope, element, attrs, notifier) {
          var unbinds = {}, classes = expr(scope), prevClass = angular.copy(classes);
          function replace() {
            var classes = expr(scope);
            if (typeof classes !== 'object') {
              if (classes) {
                // force string conversion
                if (prevClass) {
                  element.removeClass(prevClass + '');
                }
                element.addClass(classes + '');
                prevClass = angular.copy(classes);
              } else {
                element.removeClass(prevClass);
                prevClass = false;
              }

            } else {
              angular.forEach(classes, function (value, className) {
                if (value) {
                  if (!element.hasClass(className)) {
                    element.addClass(className);
                  }
                } else {
                  if (element.hasClass(className)) {
                    element.removeClass(className);
                  }
                }
              });
            }

          }

          function watchHandler(key, newValue) {
            if (newValue !== undefined) {
              unbinds[key]();
              replace();
            }
          }

          if (force) {
            replace();
          } else {
            angular.forEach(classes, function (value, key) {
              unbinds[key] = scope.$watch(expr, function (newValue) {
                watchHandler(key, newValue);
              });
            });
          }
          if (notifier) {
            notifier.getEventName(function (name) {
              scope.$on(name, replace);
            });
          }

        };
      }
    };
  });
  $compileProvider.directive('fboIf', function ($parse, $compile) {
    return {
      require: '?^fboNotifier',
      compile: function (element, attrs, transclude) {
        var contents = element.contents().remove(),
          expr = $parse(attrs.fboIf),
          force = attrs.force !== undefined;
        return function link(scope, element, attrs, notifier) {
          var unbind, comment = document.createComment(' fboIf ' + attrs.fboIf),
            commentElement = angular.element(comment);
          element.replaceWith(comment);
          element.commented = true;
          function replace(newValue) {
            if (newValue) {
              if (commentElement.parent()[0]) {
                $compile(contents, transclude)(scope, function (clone) {
                  element.append(clone);
                  commentElement.replaceWith(element);
                });
              }
            } else {
              if (element.parent()[0]) {
                element.replaceWith(comment);
                element.contents().remove();
              }
            }
          }

          function watchHandler(newValue) {
            if (newValue !== undefined) {
              unbind();
              replace(newValue);
            }
          }
          if (force) {
            replace(expr(scope));
          } else {
            unbind = scope.$watch(expr, watchHandler);
          }

          if (notifier) {
            notifier.getEventName(function (name) {
              scope.$on(name, function () {
                replace(expr(scope));
              });
            });
          }
        };
      }
    };
  });
  $compileProvider.directive('fboSwitch', function ($parse, $compile) {
    return {
      require: '^?fboNotifier',
      controller: function ($scope) {
        $scope.children = {};
        this.addChild = function (value, element) {
          $scope.children[value] = {element: element, comment: angular.element(document.createComment(' fboSwitchWhen ' + value))};
        };
        this.setDefault = function (element) {
          $scope.defaultChild = {element: element, comment: angular.element(document.createComment(' fboSwitchDefault '))};
        };
      },
      compile: function (element, attrs, transclude) {
        var expr = $parse(attrs.fboSwitch);
        return function link(scope, element, attrs, notifier) {
          var contents = {},
            defaultContent,
            defaultChild = scope.defaultChild;
          function replace () {
            var needsDefault = true,
              switchValue = expr(scope),
              children = scope.children;
            angular.forEach(children, function (child, value) {
              var valExpr = $parse(value), realValue = valExpr(scope) || value;

              if (realValue != switchValue) {
                if (child.element.parent()[0]) {
                  child.element.replaceWith(child.comment);
                  child.element.contents().remove();
                }
              } else {
                if (child.comment.parent()[0]) {
                  $compile(contents[value], transclude)(scope, function (clone) {
                    child.element.append(clone);
                    child.comment.replaceWith(child.element);
                  });
                }
                needsDefault = false;
              }
            });
            if (!needsDefault && defaultChild.element) {
              if (defaultChild.element.parent()[0]) {
                defaultChild.element.replaceWith(defaultChild.comment);
                defaultChild.element.contents().remove();
              }
            } else {
              $compile(defaultContent.remove(), transclude)(scope, function (clone) {
                if (defaultChild.comment.parent()[0]) {
                  defaultChild.element.append(clone);
                  defaultChild.comment.replaceWith(defaultChild.element);
                }
              });
            }
          }
          angular.forEach(scope.children, function (child, key) {
            contents[key] = child.element.contents().remove();
            child.element.replaceWith(child.comment);
          });
          defaultContent = defaultChild.element.contents();
          defaultChild.element.replaceWith(defaultChild.comment);
          if (notifier) {
            notifier.getEventName(function (name) {
              scope.$on(name, function () {
                replace();
              });
            });
          } else {
            replace();
          }
        };
      }
    };
  });
  $compileProvider.directive('fboSwitchWhen', function () {
    return {
      require: '^fboSwitch',
      link: function (scope, element, attr, ctrl) {
        ctrl.addChild(attr.fboSwitchWhen, element);
      }
    };
  });
  $compileProvider.directive('fboSwitchDefault', function () {
    return {
      require: '^fboSwitch',
      link: function (scope, element, attr, ctrl) {
        ctrl.setDefault(element);
      }
    };
  });
  $compileProvider.directive('fboShow', function ($parse) {
    return {
      require: '^?fboNotifier',
      compile: function (element, attrs) {
        var expr = $parse(attrs.fboShow),
          force = attrs.force !== undefined;
        return function link(scope, element, attrs, notifier) {
          var unbinds = angular.noop;

          function replace(value) {
            if (value) {
              element.removeClass('ng-hide');
            } else {
              if (!element.hasClass('ng-hide')) {
                element.addClass('ng-hide');
              }
            }
          }
          function watchHandler(newValue) {
            if (newValue !== undefined) {
              unbinds();
              replace(newValue);
            }
          }
          if (force) {
            replace(expr(scope));
          } else {
            unbinds = scope.$watch(expr, function (newValue) {
              watchHandler(newValue);
            });
          }
          if (notifier) {
            notifier.getEventName(function (name) {
              scope.$on(name, function () {
                replace(expr(scope));
              });
            });
          }
        };
      }
    };
  });
  $compileProvider.directive('fboHide', function ($parse) {
    return {
      require: '^?fboNotifier',
      compile: function (element, attrs) {
        var expr = $parse(attrs.fboHide),
          force = attrs.force !== undefined;
        return function link(scope, element, attrs, notifier) {
          var unbinds = angular.noop;

          function replace(value) {
            if (!value) {
              element.removeClass('ng-hide');
            } else {
              if (!element.hasClass('ng-hide')) {
                element.addClass('ng-hide');
              }
            }
          }
          function watchHandler(newValue) {
            if (newValue !== undefined) {
              unbinds();
              replace(newValue);
            }
          }
          if (force) {
            replace(expr(scope));
          } else {
            unbinds = scope.$watch(expr, function (newValue) {
              watchHandler(newValue);
            });
          }
          if (notifier) {
            notifier.getEventName(function (name) {
              scope.$on(name, function () {
                replace(expr(scope));
              });
            });
          }
        };
      }
    };
  });
});