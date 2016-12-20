/* eslint-env node */
/* eslint camelcase:0 */

var gulp = require('gulp');
var eslint = require('gulp-eslint');
var concat = require('gulp-concat');
var plumber = require('gulp-plumber');
var path = require('path');
var ngAnnotate = require('gulp-ng-annotate');
var sourcemaps = require('gulp-sourcemaps');
var KarmaServer = require('karma').Server;
var wiredep = require('wiredep').stream;
var webserver = require('gulp-webserver');
var child_process = require('child_process');
var embedTemplates = require('gulp-angular-embed-templates');
var sass = require('gulp-sass');
var ghPages = require('gulp-gh-pages');

gulp.task('example:build', ['js'], function() {
  gulp.src('./example/index.html')
    .pipe(wiredep({includeSelf: true}))
    .pipe(gulp.dest('./example/'));
});

gulp.task('example', ['example:build'], function() {
  gulp.src('.')
    .pipe(webserver({
      livereload: false,
      directoryListing: false,
      open: '/example',
      port: 9000
    }));
});

gulp.task('lint', function() {
  return gulp.src(['src/**/*.js'])
  .pipe(eslint())
  .pipe(eslint.format()) // console output
  .pipe(eslint.failOnError());
});

gulp.task('styles', function() {
  return gulp.src(['src/bootstrap.scss'], {base: 'src'})
  .pipe(sourcemaps.init())
    .pipe(sass({
      style: 'expanded',
      includePaths: './bower_components'
    }))
    .pipe(concat('angular-hbp-collaboratory.css'))
  .pipe(sourcemaps.write('./maps'))
  .pipe(gulp.dest('.'));
});

gulp.task('karma', function(done) {
  new KarmaServer({
    configFile: path.join(__dirname, 'karma.conf.js'),
    singleRun: true
  }, done).start();
});

gulp.task('karma:dist', ['js'], function(done) {
  new KarmaServer({
    configFile: path.join(__dirname, 'karma-dist.conf.js'),
    singleRun: true
  }, done).start();
});

gulp.task('js', function() {
  return gulp.src([
    'LICENSE',
    'src/header.txt',
    'src/main.js',
    'src/**/*.module.js',
    'src/**/*.js',
    '!src/**/*.spec.js',
    'src/main.js',
    'src/footer.txt'
  ], {base: 'src'})
  .pipe(plumber())
  .pipe(sourcemaps.init())
    .pipe(embedTemplates())
    .pipe(concat('angular-hbp-collaboratory.js'))
    .pipe(ngAnnotate({single_quotes: true}))
  .pipe(sourcemaps.write('./maps'))
  .pipe(gulp.dest('.'));
});

gulp.task('doc', function(done) {
  child_process.exec([
    'jsdoc',
    '-c ./jsdoc.conf.json',
    './README.rst'
    // '--debug', // Useful to see what is wrong.
  ].join(' '), function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    done(err);
  });
});

// This task is for development only.
// It generates the HTML doc using Sphinx
gulp.task('doc:html', ['doc'], function(done) {
  child_process.exec([
    'sphinx-build',
    '-c ./',
    'docs',
    'output'
  ].join(' '), function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    done(err);
  });
});

gulp.task('deploy:doc', ['doc:html'], function() {
  return gulp.src(['./output/**/*', './output/**/.*'])
    .pipe(ghPages());
});

gulp.task('default', [
  'test',
  'js',
  'styles',
  'karma:dist',
  'doc',
  'example:build'
]);

gulp.task('test', ['karma', 'lint']);

gulp.task('watch', function() {
  gulp.watch(['src/**/*.js'], ['lint', 'js']);
  gulp.watch(['src/**/*.scss'], ['styles']);
  gulp.watch(['src/**/*.html'], ['js']);
  new KarmaServer({
    configFile: path.join(__dirname, 'karma.conf.js')
  }).start();
});
