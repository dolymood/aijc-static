var gulp = require('gulp');
var plugins = require('gulp-load-plugins')();
var gutil = plugins['util'];

var config = require('./config/requirejs.json');

var pjname = gutil.env.pjn || 'pan';
var pjversion = gutil.env.pjv || 2;

var mjpath = './tmp/j/';

var jpath = './j/';
var cpath = './c/';
var ipath = './i/';
var fpath = './f/'

var tjpath = './build/j/';
var tcpath = './build/c/';
var tipath = './build/i/';
var tfpath = './build/f/'

/** 开始-----JS部分 **/

gulp.task('cleantmp', function() {

	return gulp.src(mjpath.slice(0, -1), {
		read: false
	}).pipe(plugins.clean({
		force: true
	}));

});

gulp.task('cleanjs', function() {

	return gulp.src(tjpath, {
		read: false
	}).pipe(plugins.clean({
		force: true
	}));

});

// copy 文件到 tmp目录
gulp.task('copy', ['cleantmp'], function() {

	return gulp.src(jpath + '**').pipe(gulp.dest(mjpath));

});

// 编译coffee
gulp.task('coffee', ['copy'], function() {
	
	return gulp.src(mjpath + '**/*.{coffee,litcoffee,coffee.md}')
	.pipe(plugins.coffee({
		bare: true
	})).pipe(gulp.dest(mjpath));

});

var jstasks = ['cleanjs'];
if (gutil.env.coffee) {
	jstasks.unshift('coffee');
}

gulp.task('rename', jstasks, function() {
	var src = gutil.env.coffee ? mjpath : jpath;
	return gulp.src(src + '**/*.coffee.js')
	.pipe(plugins.clean())
	.pipe(plugins.rename(function(path) {
		path.basename = path.basename.replace(/\.coffee/g, '');
	}))
	.pipe(gulp.dest(src));
});

gulp.task('rmin', ['rename'], function(cb) {
	var src = gutil.env.coffee ? mjpath : jpath;
	// gulp.src(src + '**/*.js')
	// .pipe(plugins.replace(/(config|cs|lcs)!/g, ''))
	plugins.requirejs({
		isBuild: true,
		appDir: src,
		dir: tjpath,
		baseUrl: './',	//这里不能和appDir相同，否则源码会被污染
		//忽略需要共享缓存的文件
		paths: {
			jquery: 'empty:',
			angular: 'empty:',

			qrcode: 'empty:',
			jsbn: 'empty:',
			d3: 'empty:',
			nvd3: 'empty:'
		},
		mainConfigFile: src + 'common/baseConfig.js',
		// 打包前替换源码
		onBuildRead: function(moduleName, path, contents) {
			
			// 移除插件，仅删除字符，非stubModules
			contents = contents.replace(/(config|cs|lcs)!/g,'')
			return contents
		},
		// onBuildWrite: function(moduleName, path, contents) {
		// 	console.info('写入：' + moduleName);
		// 	return contents;
		// },
		onModuleBundleComplete: function(data){
			gutil.log('打包完成： ' + data.name);
		},
		onFinish: function(response) {
			gutil.log('全部完成');
			cb();
		},
		optimize: 'uglify2',
		uglify2: {
			compress: {
				drop_console: true 
			}
		},
		
		// 不删除release文件夹，因为还要上传
		removeCombined: false,
		// 排除一些文件
		fileExclusionRegExp: /^\.|\.(coffee|md|txt|gitignore)$/,
		preserveLicenseComments: false,
		modules: config[pjname]['v' + pjversion]['modules']
	});

});

gulp.task('j', ['rmin'], function() {
	var modules = config[pjname]['v' + pjversion]['modules'];
	modules = modules.map(function(p) {
		return '/' + p.name
	});
	gulp.src(tjpath + '{' + modules.join(',') + '}' + '.js')
	.pipe(plugins.clean())
	.pipe(plugins.rev())
	.pipe(gulp.dest(function(a) {
		return a.base
	}));
	gutil.log('完成js打包');
});

/** 结束-----JS部分 **/


/** 开始-----CSS部分 **/

gulp.task('cleancss', function() {

	return gulp.src(tcpath, {
		read: false
	}).pipe(plugins.clean({
		force: true
	}));

});

gulp.task('c', ['cleancss'], function() {
	gulp.src(cpath + '*.css')
	.pipe(plugins.minifyCss())
	.pipe(plugins.rev())
	.pipe(gulp.dest(tcpath));
});

/** 结束-----CSS部分 **/



/** 开始-----IMG部分 **/

gulp.task('cleanimg', function() {

	return gulp.src(tipath, {
		read: false
	}).pipe(plugins.clean({
		force: true
	}));

});

gulp.task('i', ['cleanimg'], function() {
	// swf,ttf,eot,woff,webp,cur
	gulp.src(ipath + '**/*.{png,gif,jpg,svg}')
	.pipe(plugins.imagemin())
	.pipe(gulp.dest(tipath));
});

/** 结束-----IMG部分 **/

/** 开始-----FONT部分 **/

gulp.task('cleanfont', function() {

	return gulp.src(tfpath, {
		read: false
	}).pipe(plugins.clean({
		force: true
	}));

});

gulp.task('f', ['cleanfont'], function() {
	// swf,ttf,eot,woff,webp,cur
	gulp.src(fpath + '**/*.{eot,svg,ttf,woff}')
	.pipe(gulp.dest(tfpath));
});

/** 结束-----FONT部分 **/


/** 开始-----coffee server 部分 **/

gulp.task('connect', function() {
	
	plugins.connect.server({
		// 不能在root中出现 . .. 这样的path
		root: process.cwd(),
		livereload: true
	});

});

gulp.task('nowrename', ['coffee'], function() {
	var src = mjpath;
	return gulp.src(src + '**/*.coffee.js')
	.pipe(plugins.clean())
	.pipe(plugins.rename(function(path) {
		path.basename = path.basename.replace(/\.coffee/g, '');
	}))
	.pipe(gulp.dest(src));
});

gulp.task('watch', ['nowrename'], function() {
	gulp.src(jpath + '**/*.{coffee,litcoffee,coffee.md}')
	.pipe(plugins.watch(function(files) {

		files.pipe(plugins.coffee({
			bare: true
		}))
		.pipe(plugins.rename(function(path) {
			path.basename = path.basename.replace(/\.coffee/g, '');
		}))
		.pipe(gulp.dest(mjpath))
		.pipe(plugins.connect.reload());

	}))
	
});

// coffee server
gulp.task('s', ['connect', 'watch'], function() {
	gutil.log('coffee server ok.')
});


/** 结束-----coffee server 部分 **/

gulp.task('build', ['c', 'i', 'f'], function() {
	gutil.log('build ok.')
});

gulp.task('default', ['build'], function() {
	gutil.log('default ok.')
});

