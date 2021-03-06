var gulp = require('gulp');
var $    = require('gulp-load-plugins')();

var sassPaths = [
  'bower_components/foundation-sites/scss',
  'bower_components/motion-ui/src'
];

gulp.task('sass', function() {
  return gulp.src('scss/app.scss')
    .pipe($.sass({
      includePaths: sassPaths
    })
      .on('error', $.sass.logError))
    .pipe($.autoprefixer({
      browsers: ['last 2 versions', 'ie >= 9']
    }))
    .pipe(gulp.dest('css'));
});

gulp.task('js', function() {
  return gulp.src([
      'js/dev/schools.js',
      'js/dev/w.js',
      'js/dev/app.js'
    ])
    .pipe($.concat('js/app.min.js'))
    .pipe($.uglify())
    .pipe(gulp.dest(''));
});

gulp.task('default', ['sass', 'js'], function() {
  gulp.watch(['scss/**/*.scss'], ['sass']);
  gulp.watch(['js/**/*.js'], ['js'])
});
