module.exports = {
  root: true,
  extends: ["expo"],
  overrides: [
    {
      files: ["**/__tests__/**/*.[jt]s?(x)", "**/*.(spec|test).[jt]s?(x)"],
      env: {
        jest: true,
      },
    },
  ],
};
