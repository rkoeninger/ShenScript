const gulp = require('gulp');
const mocha = require('gulp-mocha')({reporter: 'spec'});
const gutil = require('gulp-util');

const src = gulp.src.bind(gulp);
const task = gulp.task.bind(gulp);

const testFiles = 'tests.js';

task('fetch', () => gutil.log('pull down klambda and extract'));

task('test', () => src(testFiles, {read: false}).pipe(mocha));
