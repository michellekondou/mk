'use strict';


// -----------------------------------------------------------------------------
// Dependencies
// -----------------------------------------------------------------------------

const gulp           = require('gulp');
const sass           = require('gulp-sass');//compile sass
const autoprefixer   = require('gulp-autoprefixer');//add vendor prefixes
const concat         = require('gulp-concat');//concat assets
const rename         = require("gulp-rename");//rename files
const gm             = require("gulp-gm");//resize images
const imagemin       = require("gulp-imagemin");//minify images
const changed        = require("gulp-changed");
const webp           = require('gulp-webp');//create webp versions of images
const htmlmin        = require('gulp-htmlmin');//minify html
const uglify         = require('gulp-uglify');//ninify javascript
const cleanCSS       = require('gulp-clean-css'); //minify css
const pump           = require('pump');//use pump with uglify to handle errors
const babel          = require("gulp-babel");
const browserify     = require('gulp-browserify');
const babelify       = require('babelify');
const nunjucksRender = require('gulp-nunjucks-render');
const rev            = require('gulp-rev');
const sqip           = require('gulp-sqip');
const fs             = require('fs');
const wait           = require('gulp-wait');//for vsc code makes sass compilation wait



// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

//CSS
const sassSource          = './src/assets/sass/**/*.scss';
const cssDest             = './compiled/assets/css';
const sassOptions         = { outputStyle: 'expanded' }; //expanded
const autoprefixerOptions = { browsers: ['last 2 versions', '> 5%', 'Firefox ESR'] };

//JS
const jsSource = [
    './node_modules/nunjucks/browser/nunjucks.min.js',
    './src/assets/js/lib/**/*.js',
    './src/assets/js/app.js'
];
const jsDest = './compiled/assets/js/';
const jsOptions = null;

// -----------------------------------------------------------------------------
// Sass compilation
// -----------------------------------------------------------------------------

gulp.task('sass', function () {
    return gulp.src(sassSource)
        .pipe(wait(500))
        .pipe(sass(sassOptions).on('error', sass.logError))
        .pipe(concat('app.css'))
        .pipe(autoprefixer(autoprefixerOptions))
        .pipe(cleanCSS({ compatibility: 'ie8' }))
        .pipe(gulp.dest(cssDest));
});

// -----------------------------------------------------------------------------
// JS compilation
// -----------------------------------------------------------------------------

gulp.task('concat-js', function () {
    return gulp.src(jsSource)
        .pipe(concat('app.js'))
        .pipe(gulp.dest(jsDest));
});

gulp.task('bundle', function() {
    return gulp.src(jsDest + '/app.js')
    .pipe(browserify({ transform: ['babelify'] }))
    .pipe(babel({}))
    .pipe(rename('app.bundle.js'))
    .pipe(gulp.dest(jsDest));
});

gulp.task('compress-js',['concat-js', 'bundle'], function (cb) {
    pump([
        gulp.src(jsDest + 'app.bundle.js'),
        uglify(),
        rename('app.min.js'),
        gulp.dest(jsDest)
    ],
    cb
    );
});

// -----------------------------------------------------------------------------
// Responsive Image Sizes
// -----------------------------------------------------------------------------

gulp.task('image-optimize', function () {
    gulp.src('src/media/images/**/*.*')
        .pipe(imagemin({
            progressive: true,
            verbose: true
        }))
        .pipe(gulp.dest('dist/media/images/'));
    // .pipe(gm(function (gmfile) {
    //     return gmfile.resize(800);
    // }))
    // .pipe(imagemin({
    //     progressive: true,
    //     verbose: true
    // }))
    // .pipe(rename(function (path) {
    //     path.basename += '-800'
    // }))
    // .pipe(gulp.dest('dist/images/'));

    // gulp.src('src/images/**/*.*')
    //     .pipe(gm(function (gmfile) {
    //         return gmfile.resize(400);
    //     }))
    //     .pipe(imagemin({
    //         progressive: true,
    //         verbose: true
    //     }))
    //     .pipe(rename(function (path) {
    //         path.basename += '-400'
    //     }))
    //     .pipe(gulp.dest('dist/images/'));
});

gulp.task('create-webP', () =>
    gulp.src('dist/images/**/*.*')
        .pipe(webp())
        .pipe(gulp.dest('dist/images/'))
);

gulp.task('generate-svg-placeholders', function () {
    gulp.src('./src/media/images/*.+(jpg|jpeg|png)')
        .pipe(sqip({
            numberOfPrimitives: 12 //optional parameter (default: 22)
        }))
        .pipe(gulp.dest('./compiled/media/images/'));
});

// -----------------------------------------------------------------------------
// Compression
// -----------------------------------------------------------------------------

gulp.task('minify', function () {
    return gulp.src('./compiled/**/*.html')
        .pipe(htmlmin({ 
            collapseWhitespace: true,
            minifyCSS: true,
            minifyURLs: true,
            removeComments: true,
            removeEmptyAttributes: true,
            verbose: true }))
        .pipe(gulp.dest('./compiled/'));
});

// -----------------------------------------------------------------------------
// Nunjucks
// -----------------------------------------------------------------------------
const path = './src/data/projects.json';

gulp.task('nunjucks-nav', function(cb, err){
    //parse json data
    var jsondata = JSON.parse(fs.readFileSync(path, 'utf8'));
    var posts = [];
    for (var i = 0; i < jsondata.length; i++) {
        var post = jsondata[i];
        posts.push(post);
    }
    console.log(posts[4].project_title);
    //build navigation
    gulp.src('./src/templates/navigation.nunjucks')
        .pipe(nunjucksRender({
            data: {
                project_slug: posts
            },
            envOptions: {
                autoescape: false
            },
            path: ['src/templates/']
        }))
        .pipe(gulp.dest('./src/templates/partials/'));
    cb(err);
});

gulp.task('nunjucks', function () {
    gulp.src('./src/templates/pages/index.html')
        .pipe(nunjucksRender({
            data: {
                site_title: "Michelle Kondou" 
            },
            envOptions: {
                autoescape: false
            },
            path: ['src/templates/'],
            ext: '.html'
        }))
        .pipe(rename('index.html'))
        .pipe(gulp.dest('./compiled/'));
});

gulp.task('nunjucks-projects', ['nunjucks-nav'], function () {
    //parse json data
    var jsondata = JSON.parse(fs.readFileSync(path, 'utf8'));
    var posts = [];
    for (var i = 0; i < jsondata.length; i++) {
        var post = jsondata[i];
        posts.push(post);
    }
    
    //generate html pages from json data
    for (var k = 0; k < posts.length; k++) {
        var _project = posts[k];
        var _image = _project.project_media.images;
        var images = [];
        var _video = _project.project_media.videos;
        var videos = [];
        for (var l = 0; l < _image.length; l++) {
            var image = _image[l];
            images.push(image);
        }
        for (var m = 0; m < _video.length; m++) {
            var video = _video[m];
            videos.push(video);
        }
        gulp.src('./src/templates/pages/projects.html')
            .pipe(nunjucksRender({
                data: {
                    url: _project.project_slug,
                    project_title: _project.project_title,
                    project_subtitle: _project.project_subtitle,
                    project_shortname: _project.project_shortname,
                    project_description: _project.project_description,
                    my_role: _project.my_role,
                    project_images: images,
                    project_videos: videos 
                },
                envOptions: {
                    autoescape: false
                },
                path: ['src/templates/'],
                ext: '.html'
            }))  
            .pipe(rename(_project.project_slug + '.html'))
            .pipe(gulp.dest('./compiled/projects/'));
    } //endfor
 
});

// -----------------------------------------------------------------------------
// Fonts
// -----------------------------------------------------------------------------

gulp.task('fonts', function () {
    gulp.src('./src/assets/fonts/**/*.*')
        .pipe(gulp.dest('./compiled/assets/fonts/'));
});

// -----------------------------------------------------------------------------
// Watchers
// -----------------------------------------------------------------------------

gulp.task('watch', function () {
    gulp
        // Watch the input folder for change,
        // and run `sass` task when something happens
        .watch(sassSource, ['sass'])
        // When there is a change,
        // log a message in the console
        .on('change', function (event) {
            console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
        });
    gulp
        .watch('./src/assets/js/**/*.js', ['compress-js'])
        .on('change', function (event) {
            console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
        }); 
    gulp
        .watch(['./src/data/*.json', './src/templates/**/*.+(html|nunjucks)'], ['nunjucks-projects', 'nunjucks'])
        .on('change', function (event) {
            console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
        });  
    gulp
        .watch('./compiled/**/*.html', ['minify'])
        .on('change', function (event) {
            console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
        });
    gulp
        .watch('./src/assets/fonts/', ['fonts'])
        .on('change', function (event) {
            console.log('File ' + event.path + ' was ' + event.type + ', running tasks...');
        });
});


// -----------------------------------------------------------------------------
// Production build
// -----------------------------------------------------------------------------

gulp.task('prod', function () {
    return gulp
        .src(input)
        .pipe(sass((sassOptions)))
        .pipe(autoprefixer(autoprefixerOptions))
        .pipe(gulp.dest(output));
});


// -----------------------------------------------------------------------------
// Default task
// -----------------------------------------------------------------------------

gulp.task('default', ['sass', 'compress-js','minify', 'watch']);
