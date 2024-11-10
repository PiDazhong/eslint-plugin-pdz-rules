## 功能

- 两个 eslint 的规则

- 一个是限制 `../` 的层级限制

- 一个是自动排序文件内的 `import`

## 使用示例

```js

module.exports = {
  ...eslint,
  plugins: ['pdz-rules'],
  rules: {
    ...rules,
    'custom-rules/no-deep-relative-imports': [
      'warn',
      { maxDepth: 2, rootDir: 'src' },
    ],
    'custom-rules/sort-imports-by-rules': [
      'warn',
      {
        equal: ['react', 'antd', '@ant-design/icons', 'antd/locale/zh_CN', 'lodash'],
        local: ['src', 'pages'],
      },
    ],
  },
};

```

