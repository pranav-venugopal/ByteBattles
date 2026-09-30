import Editor from "@monaco-editor/react";
import type { Language } from "../services/submissions";
import { LANGUAGES } from "./languages";

interface Props {
  language: Language;
  value: string;
  onChange: (value: string) => void;
  theme: "light" | "dark";
}

export default function CodeEditor({ language, value, onChange, theme }: Props) {
  return (
    <Editor
      height="420px"
      theme={theme === "dark" ? "vs-dark" : "vs"}
      language={LANGUAGES.find((l) => l.value === language)?.monaco}
      value={value}
      onChange={(v) => onChange(v ?? "")}
      options={{
        autoClosingBrackets: "always",
        autoClosingQuotes: "always",
        autoClosingOvertype: "always",
        autoSurround: "languageDefined",
        bracketPairColorization: { enabled: true },
        minimap: { enabled: false },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', 'Geist Mono', Consolas, monospace",
        tabSize: 4,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        padding: { top: 16, bottom: 16 },
        renderLineHighlight: "gutter",
        guides: { indentation: true, bracketPairs: true },
        lineNumbersMinChars: 3,
        smoothScrolling: true,
      }}
    />
  );
}
