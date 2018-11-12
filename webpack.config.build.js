const path = require('path');
const {VueLoaderPlugin} = require('vue-loader');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');

module.exports = env => {
    const env_mode = env.NODE_ENV !== 'production';
    return {
        devtool: false,
        entry: path.resolve(__dirname, 'src/index.js'),
        mode: env.NODE_ENV,
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
        optimization: env_mode ? {} : {
            minimizer: [new UglifyJsPlugin({
                cache: true,
                parallel: 8,
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
    }
};