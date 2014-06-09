ngFbo
=====
First of all I'd like to thank Karl Seamon who inspired me through his ngConf talk [Angular Performance](http://www.youtube.com/watch?v=zyYpHIOrk_Y), this is kind of a copy paste of his work.

Install through bower:
```
bower install ngFbo
```

ngFbo tries to resolve the binding madness generated by AngularJS, providing the following directives:
*fboParse*, *fboBindHtml*, *fboClass*, *fboIf*, *fboSwitch*, *fboShow*, *fboHide*.
Each of this directives waits for the binded values to be different from undefined before rendering unless the _force_ attribute is set, for example:
```
<span fbo-show="{variable}"></span>
```
**fboShow** will wail until *variable* is defined before deciding to hide/show the span. 
```
<span fbo-show="{variable}" force></span>
```
**fboShow** forces the directive to decide even if *variable* === *undefined*


**fboNotifier** directive in charge of watching a variable and broadcasting events to child directives triggering updates


fboParse
--------
Parse everything inside the _fbo-parse_ attribute in a similar way as angular parses text but instead of using {{...}} it uses {...}. 

*JS*
```javascript
$scope.variable = "variable";
$scope.array = [1,2,3,4,5];
```

*HTML*
```
<span fbo-parse="This shows the following variable: {variable} & {array|count}"></span>
```

*Renders*
```
<span>This shows the following variable: variable & 5</span>
```

fboBindHtml
-----------
Binds HTML or a text variable which is then parsed, compiled & rendered.

*JS*
```javascript
$scope.html = "<ul><li fbo-parse='{nonHtml}'></li></ul>";
$scope.nonHtml = "a simple string";
```

*HTML*
```
<div fbo-bind-html="html"></div>
<div fbo-bind-html="nonHtml"></div>
```

*Renders*
```
<div>
    <ul>
        <li>a simple string</li>
    </ul>
 </div>
 <div>
    <span>a simple string</span>
 </div>
```
fboClass
-----------
Binds class as variable or object just like ng-class

*JS*
```javascript
$scope.className = 'span-2';
$scope.active = true;
```

*HTML*
```
<div fbo-class="className"></div>
<div fbo-class="{'active': active}"></div>
```

fboIf
-----------
Renders HTML based on a variable, just like ng-if

*JS*
```javascript
$scope.render = true
```

*HTML*
```
<div fbo-if="html"></div>
```

*Renders*
```
<div>
    <ul>
        <li>a simple string</li>
    </ul>
 </div>
 <div>
    <span>a simple string</span>
 </div>
```

fboSwitch, fboSwitchWhen & fboSwitchDefault
----------------------------------------------------------
Analogous to ngSwitch

*JS*
```javascript
$scope.option = 1
```

*HTML*
```
<div fbo-switch="option">
    <div fbo-switch-when="0">This is option 0</div>
    <div fbo-switch-when="1">This is option 1</div>
    <div fbo-switch-default>This is the default option</div>
</div>
```

*Renders*
```
<div>
    <div>This is option 1</div>
</div>
```
fboShow & fboHide
------------------------
Analogous to ngShow & ngHide

*JS*
```javascript
$scope.show = true;
```

*HTML*
```
<div fbo-show="show">Show</div>
<div fbo-hide="show">Hide</div>
```

*Renders*
```
<div>Show</div>
<div class="ng-hide">Hide</div>
```

fboNotifier
-------------
Adds a $watcher on a specified variable and updates all fbo-* children.
The advantage of using fboNotifier that you can combine multiple watchers into one.

*JS*
```javascript
$scope.titile = 'Initial title';
$scope.show = false;

$timeout(function () {
    $scope.title = 'Title after 2 seconds';
    $scope.show = true;
    $scope.update = Date.now();
}, 2000);

$timeout(function () {
    $scope.title = 'Title after 4 seconds';
    $scope.show = false;
    $scope.update = Date.now();
}, 4000);
```

*HTML*
```
<div fbo-notifier="update">
    <h1 fbo-parse="title"></h1>
    <p fbo-show="show">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    </p>
</div>
```

*Renders*

*Initially*
```
<div>
    <h1>Initial title</h1>
    <p class="ng-hide">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    </p>
</div>
```
*After 2 seconds*
```
<div>
    <h1>Title after 2 seconds</h1>
    <p>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    </p>
</div>
```
*After 4 seconds*
```
<div>
    <h1>Title after 4 seconds</h1>
    <p class="ng-hide">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit.
    </p>
</div>
```