const del = require('del');
const gulp = require('gulp');
const gunzip = require('gulp-gunzip');
const gutil = require('gulp-util');
const mocha = require('gulp-mocha');
const rename = require('gulp-rename');
const request = require('request');
const source = require('vinyl-source-stream');
const untar = require('gulp-untar');
const webpackConfig = require('./webpack.config.js');
const webpack = require('webpack-stream')(webpackConfig);

const src = gulp.src.bind(gulp);
const dest = gulp.dest.bind(gulp);
const task = gulp.task.bind(gulp);

const srcFiles = ['./src/**/*.js', './dist/kernel.js'];
const testFiles = './tests.js';
const distRoot = './dist';

const kernelVersion = '21.1';
const kernelFolderName = `ShenOSKernel-${kernelVersion}`;
const kernelArchiveName = `${kernelFolderName}.tar.gz`;
const kernelArchiveUrlBase = 'https://github.com/Shen-Language/shen-sources/releases/download';
const kernelArchiveUrl = `${kernelArchiveUrlBase}/shen-${kernelVersion}/${kernelArchiveName}`;

task('bundle', () =>
    src(srcFiles)
        .pipe(webpack)
        .pipe(dest(distRoot)));

task('clean', () => del([distRoot]));

task('clean-kernel', () => del(['kernel']));

task('fetch-kernel', ['clean-kernel'], () =>
    request(kernelArchiveUrl)
        .pipe(source(kernelArchiveName))
        .pipe(gunzip())
        .pipe(untar())
        .pipe(dest('.')));

task('rename-kernel', ['fetch-kernel'], () =>
    src(`./${kernelFolderName}/**/*`, { base: process.cwd() })
        .pipe(rename(path => path.dirname = path.dirname.replace(kernelFolderName, 'kernel')))
        .pipe(dest('.')));

task('fetch', ['rename-kernel'], () => del([kernelFolderName]));

task('test', () =>
    src(testFiles, { read: false })
        .pipe(mocha({ reporter: 'spec' })));
