var gulp = require('gulp');
var $ = require('gulp-load-plugins')();
// var jade = require('gulp-jade');
// var sass = require('gulp-sass');
// var plumber = require('gulp-plumber');
// var postcss = require('gulp-postcss');
var autoprefixer = require('autoprefixer'); // 非gulp套件,屬於postcss附屬套件
var mainBowerFiles = require('main-bower-files');
var browserSync = require('browser-sync').create();
var minimist = require('minimist');
var gulpSequence = require('gulp-sequence');
// require-json
request = require('request-json');
var client = request.createClient('https://randomuser.me/');
gulp.task('gg', function () {
    client.get('api/', function (err, res, body) {
        return console.log(body);
    });
});

var envOptions = { // minimist 壓縮判別
    string: 'env',
    default: { env: 'develop' }
}
var options = minimist(process.argv.slice(2), envOptions)
console.log(options)

gulp.task('clean', function () {
    return gulp.src(['./.tmp', './public'], {
            read: false
        })
        .pipe($.clean());
});

gulp.task('copyHTML', function() {
    return gulp.src('./source/**/*.html')
    .pipe(gulp.dest('./public/'))
});

// jade
gulp.task('jade', function() {
    gulp.src('./source/*.jade')
        .pipe($.plumber())
        .pipe($.data(function() {
            var khData = require('./source/data/data.json');
            var menu = require('./source/data/menu.json');
            var source = {
                'khData': khData,
                'menu': menu
            };
            console.log('jade', source)
            return source;
        }))
        .pipe($.jade({
            pretty: true
        }))
        .pipe(gulp.dest('./public/'))
        .pipe(browserSync.stream());
});

// sass
gulp.task('sass', function() {
    var plugins = [
        autoprefixer({ browsers: ['last 2 version', '> 5%', 'ie 9'] }) // 最新第2版瀏覽器
    ];
    return gulp.src('./source/scss/**/*.scss')
        .pipe($.plumber())
        .pipe($.sourcemaps.init())
        .pipe($.sass({
            'includePaths': ['./bower_components/bootstrap-sass/assets/stylesheets']
        }).on('error', $.sass.logError)) // 編譯完成的 CSS
        .pipe($.postcss(plugins))
        .pipe($.if(options.env === 'production', $.cleanCss())) // 建議採用,取代原來的gulp-minify-css
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest('./public/css'))
        .pipe(browserSync.stream());
});

// babel
gulp.task('babel', () => {
    return gulp.src('./source/js/**/*.js')
        .pipe($.sourcemaps.init())
        .pipe($.babel({
            presets: ['es2015'] 
        }))
        .pipe($.concat('all.js'))
        .pipe($.if(options.env === 'production', $.uglify({
            compress: {
                drop_console: true
            }
        })))
        .pipe($.sourcemaps.write('.'))
        .pipe(gulp.dest('./public/js'))
        .pipe(browserSync.stream());
}); 

// bower
gulp.task('bower', function() {
    return gulp.src(mainBowerFiles())
        .pipe(gulp.dest('./.tmp/vendors'))
});

gulp.task('vendorJs', ['bower'], function() {
    return gulp.src(['./.tmp/vendors/**/**.js'])
        .pipe($.order([
            'jquery.js',
            'bootstrap.js',
            'vue'
        ]))
        .pipe($.concat('vendors.js'))
        .pipe($.if(options.env === 'production', $.uglify()))
        .pipe(gulp.dest('./public/js'));
});

// browser-sync
gulp.task('browser-sync', function () {
    browserSync.init({
        server: {
            baseDir: './public'
        },
        reloadDebounce: 2000
    });
});

// vuejs
gulp.task('bower', function() {
    return gulp.src(mainBowerFiles({
            "overrides": {
                "vue": { // 套件名稱
                    "main": "dist/vue.js" // 取用的資料夾路徑
                }
            }
        }))
        .pipe(gulp.dest('./.tmp/vendors'));
    cb(err);
});

// imagemin
gulp.task('image-min', () =>
    gulp.src('./source/images/*')
    .pipe($.if(options.env === 'production', $.imagemin()))
    .pipe(gulp.dest('./public/images'))
);

// watch
gulp.task('watch', function () {
    gulp.watch('./source/scss/**/*.scss', ['sass']);
    gulp.watch('./source/*.jade', ['jade']);
    gulp.watch('./source/js/**/*.js', ['babel']);
});

// deploy
gulp.task('deploy', function () {
    return gulp.src('./public/**/*')
        .pipe($.ghPages());
});

gulp.task('build', gulpSequence('clean', 'jade', 'sass', 'babel', 'vendorJs'))

gulp.task('default', ['jade', 'sass', 'babel', 'vendorJs', 'browser-sync', 'image-min', 'watch', 'deploy']);