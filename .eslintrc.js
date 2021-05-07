module.exports = {
    root: true,
    env: {
        node: true
    },
    extends: [
        "eslint:recommended",
        "plugin:vue/vue3-recommended"
    ],
    rules: {
        'object-curly-spacing': ["warn", "always"]
    },
    parserOptions: {
        "parser": "babel-eslint"
    }
}
