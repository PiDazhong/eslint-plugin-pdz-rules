// eslint-plugin-custom-rules/index.js
module.exports = {
  rules: {
    'no-deep-relative-imports': require('./lib/rules/no-deep-relative-imports'),
    'sort-imports-by-rules': require('./lib/rules/sort-imports-by-rules'),
  },
};
