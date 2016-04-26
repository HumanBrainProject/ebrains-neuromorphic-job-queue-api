/* eslint-env node */
/* eslint camelcase:0 */
'use strict';

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

gulp.task('tdd', function() {
  new KarmaServer({
    configFile: path.join(__dirname, 'karma.conf.js')
  }).start();
});

gulp.task('js', function() {
  return gulp.src([
    'src/*/*.js',
    'src/**/*.js',
    '!src/**/*.spec.js',
    'src/main.js'
  ])
  .pipe(plumber())
  .pipe(sourcemaps.init())
    .pipe(ngAnnotate({single_quotes: true}))
    .pipe(concat('angular-hbp-collaboratory.js'))
  .pipe(sourcemaps.write('.'))
  .pipe(gulp.dest('.'));
});

gulp.task('doc', function(done) {
  child_process.exec([
    'jsdoc',
    '-c ./jsdoc.conf.json',
    '--debug',
    './README.rst'
  ].join(' '), function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    done(err);
  });
});

gulp.task('default', ['test', 'js', 'karma:dist', 'doc']);

gulp.task('test', ['karma', 'lint']);

gulp.task('watch', ['tdd'], function() {
  gulp.watch(['src/**/*.js'], ['lint', 'js']);
});
