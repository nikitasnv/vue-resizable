const path = require('path');
const {VueLoaderPlugin} = require('vue-loader');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = {
    devtool: false,
    entry: path.resolve(__dirname, 'src/index.js'),
    mode: 'production',
    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'main.js',
        library: 'VueResizable',
        libraryTarget: 'umd'
    },
    plugins: [
        new VueLoaderPlugin()
    ],
    resolve: {
        extensions: ['*', '.js', '.vue']
    },
    performance: {
        hints: false
    },
    optimization: {
        minimizer: [new UglifyJsPlugin({
            cache: true,
            parallel: 4,
            uglifyOptions: {
                output: {
                    comments: false
                }
            }

        })],
    },
    externals: {
        vue: 'vue',
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                loader: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.vue$/,
                loader: 'vue-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: [
                    'vue-style-loader',
                    'css-loader'
                ]
            }
        ]
    }
};