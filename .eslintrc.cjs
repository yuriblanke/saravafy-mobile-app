module.exports = {
  root: true,
  extends: ["expo"],
  overrides: [
    {
      // Supabase Edge Functions run on Deno and commonly use URL imports.
      // The default Node/import resolver used by Expo ESLint can't resolve these.
      files: ["supabase/functions/**/*.{ts,tsx,js,jsx}"],
      rules: {
        // Deno URL imports (https://deno.land, https://esm.sh, etc.) are valid in Edge Functions.
        // ESLint (Node resolver) can't resolve them, so disable this rule ONLY here.
        "import/no-unresolved": "off",
      },
    },
    {
      files: ["**/__tests__/**/*.[jt]s?(x)", "**/*.(spec|test).[jt]s?(x)"],
      env: {
        jest: true,
      },
    },
  ],
};
