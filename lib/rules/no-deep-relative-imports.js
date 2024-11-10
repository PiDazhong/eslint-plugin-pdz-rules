const path = require('path');

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: '限制相对路径的深度',
      category: 'Best Practices',
      recommended: false,
    },
    messages: {
      avoidDeepRelativeImports:
        "避免使用深层嵌套的相对路径 '{{path}}'，请使用绝对路径，例如 '{{rootDir}}/{{path}}'。",
    },
    fixable: 'code', // 表示这个规则支持自动修复
    schema: [
      {
        type: 'object',
        properties: {
          maxDepth: {
            type: 'integer',
            minimum: 0,
            default: 3,
          },
          rootDir: {
            type: 'string',
            default: 'src', // 默认根目录为 'src'
          },
        },
        additionalProperties: false,
      },
    ],
  },
  create(context) {
    const maxDepth = context.options[0]?.maxDepth || 3;
    const rootDir = context.options[0]?.rootDir || 'src';
    const projectRoot = path.resolve(context.getCwd(), rootDir); // 使用配置的根目录

    return {
      ImportDeclaration(node) {
        const importPath = node.source.value;
        const relativeSegments = importPath.match(/\.\.\//g) || [];

        if (relativeSegments.length > maxDepth) {
          context.report({
            node,
            messageId: 'avoidDeepRelativeImports',
            data: { path: importPath, rootDir },
            fix: (fixer) => {
              // 计算绝对路径
              const absolutePath = path.resolve(
                path.dirname(context.getFilename()),
                importPath
              );
              const newPath = path.relative(projectRoot, absolutePath);

              // 以配置的 rootDir 为基准
              const finalPath = `${rootDir}/${newPath}`;
              return fixer.replaceText(node.source, `'${finalPath}'`);
            },
          });
        }
      },
    };
  },
};
