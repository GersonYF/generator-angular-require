'use strict';
var fs = require('fs');
var path = require('path');
var util = require('util');
var angularUtils = require('../util.js');
var yeoman = require('yeoman-generator');
var yosay = require('yosay');
var wiredep = require('wiredep');
var chalk = require('chalk');
// Bower-RequireJS
var bower = require('bower');
var _ = require('lodash');

var Generator = module.exports = function Generator(args, options) {
  yeoman.generators.Base.apply(this, arguments);
  this.argument('appname', { type: String, required: false });
  this.appname = this.appname || path.basename(process.cwd());
  this.appname = this._.camelize(this._.slugify(this._.humanize(this.appname)));

  this.option('app-suffix', {
    desc: 'Allow a custom suffix to be added to the module name',
    type: String,
    required: 'false'
  });
  this.env.options['app-suffix'] = this.options['app-suffix'];
  this.scriptAppName = this.appname + angularUtils.appName(this);

  args = ['main'];

  if (typeof this.env.options.appPath === 'undefined') {
    this.option('appPath', {
      desc: 'path/to/app is now accepted to choose where to write the files.'
    });

    this.env.options.appPath = this.options.appPath;

    if (!this.env.options.appPath) {
      try {
        this.env.options.appPath = require(path.join(process.cwd(), 'bower.json')).appPath;
      } catch (e) {}
    }

    this.env.options.appPath = this.env.options.appPath || 'app';
    this.options.appPath = this.env.options.appPath;
  }

  this.appPath = this.env.options.appPath;

  this.hookFor('angular-require:common', {
    args: args
  });

  this.hookFor('angular-require:main', {
    args: args
  });

  this.hookFor('angular-require:controller', {
    args: args
  });

  this.on('end', function () {
    this.installDependencies({
      skipInstall: this.options['skip-install'],
      skipMessage: this.options['skip-message'],
      callback: this._injectDependencies.bind(this)
    });

    var enabledComponents = [];

    if (this.resourceModule) {
      enabledComponents.push('angular-resource/angular-resource.js');
    }

    if (this.cookiesModule) {
      enabledComponents.push('angular-cookies/angular-cookies.js');
    }

    if (this.sanitizeModule) {
      enabledComponents.push('angular-sanitize/angular-sanitize.js');
    }

    if (this.routeModule) {
      enabledComponents.push('angular-route/angular-route.js');
    }

    if (this.animateModule) {
      enabledComponents.push('angular-animate/angular-animate.js');
    }

    if (this.touchModule) {
      enabledComponents.push('angular-touch/angular-touch.js');
    }

    this.invoke('karma-require:app', {
      options: {
        travis: true,
        'skip-install': this.options['skip-install'],
        components: [
          'angular/angular.js',
          'angular-mocks/angular-mocks.js'
        ].concat(enabledComponents)
      }
    });

    if (this.env.options.ngRoute) {
      this.invoke('angular-require:route', {
        args: ['about']
      });
    }
  });

  this.pkg = require('../package.json');
  this.sourceRoot(path.join(__dirname, '../templates/common'));
};

util.inherits(Generator, yeoman.generators.Base);

Generator.prototype.welcome = function welcome() {
  if (!this.options['skip-welcome-message']) {
    this.log(yosay());
    this.log(
      chalk.magenta(
        'Out of the box I include Bootstrap and some AngularJS recommended modules.' +
        '\n'
      )
    );
  }

  if (this.options.minsafe) {
    this.log.error(
      'The --minsafe flag has been removed. For more information, see' +
      '\nhttps://github.com/yeoman/generator-angular#minification-safe.' +
      '\n'
    );
  }
};

Generator.prototype.askForCompass = function askForCompass() {
  var cb = this.async();

  this.prompt([{
    type: 'confirm',
    name: 'compass',
    message: 'Would you like to use Sass (with Compass)?',
    default: true
  }], function (props) {
    this.compass = props.compass;

    cb();
  }.bind(this));
};

Generator.prototype.askForBootstrap = function askForBootstrap() {
  var compass = this.compass;
  var cb = this.async();

  this.prompt([{
    type: 'confirm',
    name: 'bootstrap',
    message: 'Would you like to include Bootstrap?',
    default: true
  }, {
    type: 'confirm',
    name: 'compassBootstrap',
    message: 'Would you like to use the Sass version of Bootstrap?',
    default: true,
    when: function (props) {
      return props.bootstrap && compass;
    }
  }], function (props) {
    this.bootstrap = props.bootstrap;
    this.compassBootstrap = props.compassBootstrap;

    cb();
  }.bind(this));
};

Generator.prototype.askForModules = function askForModules() {
  var cb = this.async();

  var prompts = [{
    type: 'checkbox',
    name: 'modules',
    message: 'Which modules would you like to include?',
    choices: [{
      value: 'resourceModule',
      name: 'angular-resource.js',
      checked: true
    }, {
      value: 'cookiesModule',
      name: 'angular-cookies.js',
      checked: true
    }, {
      value: 'sanitizeModule',
      name: 'angular-sanitize.js',
      checked: true
    }, {
      value: 'routeModule',
      name: 'angular-route.js',
      checked: true
    }, {
      value: 'animateModule',
      name: 'angular-animate.js',
      checked: true
    }, {
      value: 'touchModule',
      name: 'angular-touch.js',
      checked: true
    }]
  }];

  this.prompt(prompts, function (props) {
    var hasMod = function (mod) { return props.modules.indexOf(mod) !== -1; };
    this.resourceModule = hasMod('resourceModule');
    this.cookiesModule = hasMod('cookiesModule');
    this.sanitizeModule = hasMod('sanitizeModule');
    this.routeModule = hasMod('routeModule');
    this.animateModule = hasMod('animateModule');
    this.touchModule = hasMod('touchModule');

    var angMods = [];

    if (this.cookiesModule) {
      angMods.push("'ngCookies'");
    }

    if (this.resourceModule) {
      angMods.push("'ngResource'");
    }

    if (this.sanitizeModule) {
      angMods.push("'ngSanitize'");
    }

    if (this.routeModule) {
      angMods.push("'ngRoute'");
      this.env.options.ngRoute = true;
    }

    if (this.routeModule) {
      angMods.push("'ngAnimate'");
      this.env.options.ngAnimate = true;
    }

    if (this.routeModule) {
      angMods.push("'ngTouch'");
      this.env.options.ngTouch = true;
    }

    if (angMods.length) {
      this.env.options.angularDeps = '\n    ' + angMods.join(',\n    ') + '\n  ';
    }

    cb();
  }.bind(this));
};

Generator.prototype.readIndex = function readIndex() {
  this.ngRoute = this.env.options.ngRoute;
  this.indexFile = this.engine(this.read('app/index.html'), this);
};

Generator.prototype.bootstrapFiles = function bootstrapFiles() {
  var cssFile = 'styles/main.' + (this.compass ? 's' : '') + 'css';
  this.copy(
    path.join('app', cssFile),
    path.join(this.appPath, cssFile)
  );
};

Generator.prototype.createIndexHtml = function createIndexHtml() {
  this.indexFile = this.indexFile.replace(/&apos;/g, "'");
  this.write(path.join(this.appPath, 'index.html'), this.indexFile);
};

Generator.prototype.packageFiles = function packageFiles() {
  this.template('root/_bowerrc', '.bowerrc');
  this.template('root/_bower.json', 'bower.json');
  this.template('root/_package.json', 'package.json');
  this.template('root/_Gruntfile.js', 'Gruntfile.js');

  // RequireJS Test config
  this.template('../../templates/common/scripts/main.js', path.join(this.appPath, 'scripts/main.js'));
  // RequireJS Test config
  this.template('../../templates/common/scripts/test-main.js', 'test/test-main.js');

};

// Commented out, but left in the code for now in-case there is enough drive to have this sorted out
// in the generator rather than having grunt-bower-requirejs execute on every build/test run
/*
// Populuate Require.json when bower has finished installing dependencies
Generator.prototype.populateRequireJsConfigFromBower = function populateRequireJsConfigFromBower() {
  var bowerJsonFileContents;
  var mainJsFileContents;
  var pathsString;
  var bowerDeps;

  // appPath reference for use inside fs calls
  var appPath = this.appPath;

  // Options object, kept in the format expected by bower-requirejs
  var bowerRequireJsOptions = {
    config: 'app/scripts/main.js',
    exclude: ['requirejs', 'json3', 'es5-shim'],
    baseUrl: '../../bower_components'
  };

  // Call base generator engine method on bower.json to be able to populate the "paths" string
  bowerJsonFileContents = this.read('../../templates/common/root/_bower.json', 'utf8');
  bowerJsonFileContents = this.engine(bowerJsonFileContents, this);

  // Call base generator engine method on main.js template to be able to manipulate templated contents
  mainJsFileContents = this.read('../../templates/common/scripts/main.js', 'utf8');
  mainJsFileContents = this.engine(mainJsFileContents, this);

  // Write bower.json, calling the bower API when done
  fs.writeFile('bower.json', bowerJsonFileContents, function(err) {
    if (err) throw err;
    // Call mkdir to explicitly create /scripts/ if it doesn't exist already
    fs.mkdir(path.join(appPath + '/scripts/'));

    // Get all bower dependencies
    bower.commands.list().on('end', function (data) {
      pathsString = 'paths: {\n';
      bowerDeps = [];

      // Push all dependencies to an array we'll filter shortly
      _.forOwn(data.dependencies, function (pkg, name) {
        // Populate an array
        bowerDeps.push(name);
      });

      // Filter out dependencies based on bowerRequireJsOptions.exclude, and build
      // up the paths string
      for (var dep in bowerDeps) {
        if (bowerRequireJsOptions.exclude.indexOf(bowerDeps[dep]) === -1) {
          pathsString += '    \'' + bowerDeps[dep] + '\' : \'' + bowerRequireJsOptions.baseUrl +
            '/' + bowerDeps[dep] + '/' + bowerDeps[dep] + '\',\n';
        }
      }

      // Drop ',\n' from the end of the string
      pathsString = pathsString.substring(0, pathsString.length - 2);
      pathsString += '\n  }';

      // Replace 'paths: {}' with pathsString in mainJsFileContents
      mainJsFileContents = mainJsFileContents.replace(/paths: {}/, pathsString);

      // Write main.js and alert the user
      fs.writeFile(bowerRequireJsOptions.config, mainJsFileContents, function(err) {
        if (err) throw err;
          console.log(chalk.yellow(bowerRequireJsOptions.config + ' written\n'));
      });
    });
  });
};
*/
Generator.prototype.showGuidance = function showGuidance() {
  var guidance =
    '\nNow that everything is set up, you\'ll need to execute a build. ' +
    '\nThis is done by running' +
    '\n  grunt build' +
    '\n' +
    '\nWork with your files by using' +
    '\n  grunt serve' +
    '\n' +
    '\nThis sets a watch on your files and also opens your project in ' +
    '\na web browser using live-reload, so that any changes you make are ' +
    '\ninstantly visible.'

  console.log(guidance);
};

// This can probably be done-away with
Generator.prototype._injectDependencies = function _injectDependencies() {
  if (this.options['skip-install']) {
    this.log(
      'After running `npm install & bower install`, inject your front end dependencies' +
      '\ninto your source code by running:' +
      '\n' +
      '\n' + chalk.yellow.bold('grunt wiredep')
    );
  } else {
    wiredep({
      directory: 'bower_components',
      bowerJson: JSON.parse(fs.readFileSync('./bower.json')),
      ignorePath: new RegExp('^(' + this.appPath + '|..)/'),
      src: 'app/index.html',
      fileTypes: {
        html: {
          replace: {
            css: '<link rel="stylesheet" href="{{filePath}}">'
          }
        }
       }
    });
  }
};
