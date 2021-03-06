module.exports = {
    root: true,
    env: {
        node: true
    },
    extends: [
        "plugin:vue/vue3-essential",
        "eslint:recommended"
    ],
    rules: {
        'object-curly-spacing': ["warn", "always"]
    },
    parserOptions: {
        "parser": "babel-eslint"
    }
}