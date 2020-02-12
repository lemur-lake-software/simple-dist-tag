module.exports = {
  overrides: [{
    files: [
      "**/*.js",
    ],
    extends: [
      "lddubeau-base",
    ],
    env: {
      node: true,
    },
    overrides: [{
      files: [
        "test/**/*.js",
      ],
      env: {
        node: true,
        mocha: true,
      },
      rules: {
        // The describe blocks can get really large.
        "max-lines-per-function": "off",
      },
    }],
  }],
};
