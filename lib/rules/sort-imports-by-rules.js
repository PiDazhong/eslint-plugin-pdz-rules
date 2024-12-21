// sort-imports-by-rules.cjs
const path = require('path');
const fs = require('fs');

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: '根据指定的规则对import语句进行排序',
      category: 'Best Practices',
      recommended: false,
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          equal: { type: 'array', items: { type: 'string' } },
          local: { type: 'array', items: { type: 'string' } },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const { equal = [], local = [] } = context.options[0] || {};
    const packageJsonPath = path.resolve(context.getCwd(), 'package.json');
    let dependencies = new Set();

    // 加载 package.json 中的依赖
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      dependencies = new Set([
        ...Object.keys(packageJson.dependencies || {}),
        ...Object.keys(packageJson.devDependencies || {}),
      ]);
    }

    return {
      Program(node) {
        const importDeclarations = node.body.filter(
          (statement) => statement.type === 'ImportDeclaration',
        );

        // 为每个 import 预先计算优先级
        const importsWithSource = importDeclarations.map((decl) => ({
          node: decl,
          source: decl.source.value,
          priority: calculatePriority(decl.source.value, equal, dependencies, local),
        }));

        // 按预先计算的优先级进行排序
        const sortedImports = importsWithSource.slice().sort((a, b) => {
          return a.priority - b.priority || a.source.localeCompare(b.source);
        });

        // 检查排序是否符合预期
        importsWithSource.forEach((decl, index) => {
          if (decl.source !== sortedImports[index].source) {
            context.report({
              node: decl.node,
              message: `Import语句 "${decl.source}" 的顺序不符合指定规则`,
              fix: (fixer) => {
                const sortedCode = sortedImports
                  .map((imp) => context.getSourceCode().getText(imp.node))
                  .join('\n');
                return fixer.replaceTextRange(
                  [
                    importDeclarations[0].range[0],
                    importDeclarations[importDeclarations.length - 1].range[1],
                  ],
                  sortedCode,
                );
              },
            });
          }
        });
      },
    };
  },
};

// 定义优先级常量
const EQUAL_BASE = 0; // equal 数组中定义的固定顺序
const THIRD_PARTY_BASE = 1000; // 第三方库 优先级基准
const ABSOLUTE_PATH_PRIORITY_BASE = 2000; // 本地绝对路径，按层级递增
const RELATIVE_NON_STYLE_BASE = 3000; // 相对路径（以 ../ 开头） 非样式文件的
const RELATIVE_STYLE_BASE = 4000; // 相对路径（以 ../ 开头）  样式文件
const DEFAULT_PRIORITY = 5000; // 默认最靠后的优先级

// 计算每个 import 的优先级
function calculatePriority(source, equal, dependencies, local) {
  // 1. equal 顺序
  const equalIndex = equal.indexOf(source);
  if (equalIndex !== -1) return EQUAL_BASE + equalIndex; // equal 数组内的顺序，0~1000之间

  // 2. 三方库文件
  if (dependencies.has(source) || /^@/.test(source)) return THIRD_PARTY_BASE; // 三方库文件，1000

  // 3. 本地绝对路径文件
  if (!source.startsWith('.')) {
    for (let i = 0; i < local.length; i++) {
      if (source.startsWith(local[i] + '/')) {
        return RELATIVE_NON_STYLE_BASE - local.length + i; // 匹配 local 数组的路径，靠后的元素优先级更高，3000 - local.length + 匹配到的坐标
      }
    }
    return ABSOLUTE_PATH_PRIORITY_BASE + source.split('/').length; // 非 local 中的路径，按层级排序，2000 + 层级
  }

  // 4. 相对路径文件
  const isStyleFile = /\.(css|scss|less)$/.test(source);
  if (source.startsWith('../')) {
    const parentLevel = (source.match(/\.\.\//g) || []).length; // `../` 的数量
    const otherLevel = source.replace(/\.\.\//g, '').split('/').length - 1; // 非 `../` 的 `/` 数量
    return isStyleFile
      ? RELATIVE_STYLE_BASE + (5 - parentLevel) * 100 - otherLevel // 样式文件，4000 + 层级
      : RELATIVE_NON_STYLE_BASE + (5 - parentLevel) * 100 - otherLevel; // 非样式文件，3000 + 层级
  }

  if (source.startsWith('./')) {
    const level = source.split('/').length;
    return isStyleFile
      ? DEFAULT_PRIORITY - level // `./` 开头的样式文件，4999
      : RELATIVE_STYLE_BASE - level; // `./` 开头的非样式文件，3999
  }

  return DEFAULT_PRIORITY;
}
