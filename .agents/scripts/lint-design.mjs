import fs from 'node:fs';
import path from 'node:path';

const SRC_DIR = path.resolve(process.cwd(), 'src');

const VIOLATION_RULES = [
  {
    id: 'no-shadow',
    name: '絕對禁止陰影 (Vercel 極簡高對比無陰影，嚴禁使用實質陰影類別)',
    // Matches shadow, shadow-sm, shadow-md, shadow-lg, shadow-xl, shadow-2xl, shadow-inner, shadow-[...] BUT NOT shadow-none
    regex: /\bshadow(?!(?:-none|\w|-))\b|\bshadow-(?!none\b)(?:sm|md|lg|xl|2xl|inner|\[[^\]]+\]|[a-z0-9_-]+)\b/g,
    excludeFiles: ['src/index.css', 'src/components/welcome'],
  },
  {
    id: 'no-autofocus-dialog',
    name: '禁止自動聚焦 (No Auto-Focus in Modals)',
    // Matches autoFocus or autoFocus={true}, but NOT autoFocus={false}
    regex: /\bautoFocus(?!\s*=\s*\{?false\}?)\b/g,
    excludeFiles: [],
  },
  {
    id: 'no-hardcoded-hex-in-tsx',
    name: '禁止在 TSX 中直接硬編碼魔術色碼 (必須使用 Design Tokens)',
    regex: /(?:className|style)=["'{`][^"'`}]*#[0-9a-fA-F]{3,8}[^"'`}]*["'}`]/g,
    excludeFiles: ['src/constants', 'src/utils/muscleIntensity.ts', 'src/components/welcome'],
  }
];

function getAllFiles(dir, exts = ['.tsx', '.ts', '.css']) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist') {
        results = results.concat(getAllFiles(filePath, exts));
      }
    } else {
      if (exts.includes(path.extname(file))) {
        results.push(filePath);
      }
    }
  }
  return results;
}

function runLint() {
  console.log('🔍 [Design Token Linter] 正在掃描 src/ 目錄下的設計規範符合性...');
  const files = getAllFiles(SRC_DIR);
  let totalViolations = 0;
  const violationsByFile = new Map();

  for (const filePath of files) {
    const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    for (const rule of VIOLATION_RULES) {
      if (rule.excludeFiles.some(exc => relPath.startsWith(exc) || relPath === exc)) {
        continue;
      }

      lines.forEach((lineText, lineIdx) => {
        const trimmed = lineText.trim();
        // Skip comment lines
        if (
          trimmed.startsWith('//') ||
          trimmed.startsWith('/*') ||
          trimmed.startsWith('*') ||
          trimmed.startsWith('{/*')
        ) {
          return;
        }

        rule.regex.lastIndex = 0;
        let match;
        while ((match = rule.regex.exec(lineText)) !== null) {
          if (lineText.includes('// ignore-design-lint')) {
            continue;
          }
          
          totalViolations++;
          if (!violationsByFile.has(relPath)) {
            violationsByFile.set(relPath, []);
          }
          violationsByFile.get(relPath).push({
            rule: rule.name,
            line: lineIdx + 1,
            matched: match[0],
            snippet: trimmed
          });
        }
      });
    }
  }

  if (totalViolations === 0) {
    console.log(`✅ [Design Token Linter] 掃描完成！0 個違規項目。完全符合 Vercel 無陰影與 Design Token 規範。`);
    process.exit(0);
  } else {
    console.error(`❌ [Design Token Linter] 發現 ${totalViolations} 處規範違規：\n`);
    for (const [file, items] of violationsByFile.entries()) {
      console.error(`📁 ${file}:`);
      items.forEach(it => {
        console.error(`   第 ${it.line} 行 [${it.rule}]: ${it.snippet}`);
      });
      console.error('');
    }
    process.exit(1);
  }
}

runLint();
