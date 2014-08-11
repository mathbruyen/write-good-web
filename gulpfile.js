'use strict';

var gulp = require('gulp');
var source = require('vinyl-source-stream');

var jshint = require('gulp-jshint');
gulp.task('lint', function() {
  return gulp.src(['gulpfile.js', '*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('default'));
});

var clean = require('gulp-clean');
gulp.task('clean-browser', function() {
  return gulp.src('public/js/app.js', { read: false })
    .pipe(clean());
});

var browserify = require('browserify');
gulp.task('browser', ['clean-browser'], function() {
  return browserify('./index.js')
    .bundle()
    .pipe(source('app.js'))
    .pipe(gulp.dest('public/js'));
});

gulp.task('default', ['lint', 'browser']);
