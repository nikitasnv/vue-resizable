const path = require('path');
const {VueLoaderPlugin} = require('vue-loader');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin')

module.exports = env => {
    const env_mode = env.NODE_ENV !== 'production';
    return {
        devtool: "source-map",
        watch: env_mode,
        entry: path.resolve(__dirname, 'docs/index.js'),
        mode: env.NODE_ENV,
        output: {
            filename: 'main.js',
            path: path.resolve(__dirname, 'dist')
        },
        plugins: [
            new VueLoaderPlugin(),
            new HtmlWebpackPlugin({
                template:  path.resolve(__dirname, 'docs/index.html'),
            })
        ],
        resolve: {
            extensions: ['*', '.js', '.vue', '.json']
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
        module: {
            rules: [
                {
                    test: /\.vue$/,
                    loader: 'vue-loader',
                    exclude: /node_modules/
                },
                {
                    test: /\.js$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader'
                    }
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