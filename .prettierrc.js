module.exports = {
  singleQuote: true, // 字符串单引号
  trailingComma: 'all', // 尾随逗号
  semi: true, // 强制分号
  tabWidth: 2,
  printWidth: 100, // TODO 一行显示的最大宽度 100是一个经验值
  overrides: [
    // icode格式规范 css文件缩进是4个空格
    {
      files: '*.css',
      options: {
        tabWidth: 4,
      },
    },
  ],
};
