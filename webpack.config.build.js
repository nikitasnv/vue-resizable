const path = require('path');
const { VueLoaderPlugin } = require('vue-loader');

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