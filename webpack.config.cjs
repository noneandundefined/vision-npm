const path = require('path');

module.exports = {
	entry: './src/main.ts',
	output: {
		filename: 'vision.npm.bundle.js',
		path: path.resolve(__dirname, 'dist'),
		libraryTarget: 'umd',
	},
	resolve: {
		extensions: ['.ts', '.js'],
		fallback: {
			os: require.resolve('os-browserify/browser'),
			child_process: false,
		},
	},
	module: {
		rules: [
			{
				test: /\.ts$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
		],
	},
	mode: 'production',
};
