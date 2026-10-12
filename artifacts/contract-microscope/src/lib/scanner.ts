export type Severity = 'Critical' | 'High' | 'Medium' | 'Low';

export type Finding = {
  id: string;
  category: string;
  severity: Severity;
  functionName: string;
  line: number;
  snippet: string;
  explanation: string;
  fix: string;
};

type FunctionBlock = { name: string; header: string; body: string; start: number; end: number };

// This intentionally uses a small brace-aware scan, not a Solidity compiler.
// Comments are blanked while preserving line breaks so locations remain stable.
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (part) => part.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (part) => ' '.repeat(part.length));
}

function findFunctions(source: string): FunctionBlock[] {
  const clean = withoutComments(source);
  const found: FunctionBlock[] = [];
  const startPattern = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)[^{;]*\{/g;
  let match: RegExpExecArray | null;
  while ((match = startPattern.exec(clean))) {
    const open = clean.indexOf('{', match.index);
    let depth = 1;
    let close = open + 1;
    while (close < clean.length && depth > 0) {
      if (clean[close] === '{') depth += 1;
      if (clean[close] === '}') depth -= 1;
      close += 1;
    }
    const start = clean.slice(0, match.index).split('\n').length;
    const end = clean.slice(0, close).split('\n').length;
    found.push({
      name: match[1],
      header: clean.slice(match.index, open),
      body: clean.slice(open + 1, Math.max(open + 1, close - 1)),
      start,
      end,
    });
    startPattern.lastIndex = close;
  }
  return found;
}

function declaredStateNames(source: string): Set<string> {
  const clean = withoutComments(source);
  const firstFunction = clean.search(/\bfunction\s/);
  const declarations = firstFunction < 0 ? clean : clean.slice(0, firstFunction);
  const names = new Set<string>();
  const patterns = [
    /\b(?:u?int(?:[0-9]+)?|address|bool|string|bytes(?:[0-9]+)?)\s+(?:(?:public|private|internal|constant|immutable|payable)\s+)*([A-Za-z_$][\w$]*)\s*(?:=|;)/g,
    /\bmapping\s*\([^;]+?\)\s*(?:(?:public|private|internal)\s+)*([A-Za-z_$][\w$]*)\s*(?:=|;)/g,
  ];
  for (const pattern of patterns) {
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(declarations))) names.add(match[1]);
  }
  return names;
}

function hasStateUpdate(line: string, stateNames: Set<string>): boolean {
  if (/\bdelete\s+[A-Za-z_$][\w$]*(?:\s*\[[^\]]+\])?/.test(line)) return true;
  for (const name of stateNames) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b(?:\\s*\\[[^\\]]+\\])?\\s*(?:\\+\\+|--|[+\\-*/]?=)`).test(line)) return true;
  }
  return false;
}

function hasRelatedStateUpdate(lines: string[], startAt: number, stateNames: Set<string>): boolean {
  return lines.slice(startAt).some((line) => hasStateUpdate(line, stateNames));
}

export function scanSolidity(source: string): Finding[] {
  const originalLines = source.split('\n');
  const functions = findFunctions(source);
  const stateNames = declaredStateNames(source);
  const results: Finding[] = [];
  const sensitiveNames = new Set(['withdraw', 'mint', 'pause', 'upgradeto', 'setowner', 'setadmin']);
  const recognizedAuth = /\b(?:onlyOwner|onlyRole|onlyAdmin|auth|requiresAuth)\b/i;

  functions.forEach((fn, functionIndex) => {
    const normalizedName = fn.name.toLowerCase();
    const hasModifier = recognizedAuth.test(fn.header);
    const senderRequire = /\brequire\s*\([^;]*\bmsg\.sender\b[^;]*\)/i.test(fn.body);
    if (sensitiveNames.has(normalizedName) && !hasModifier && !senderRequire) {
      results.push({
        id: `access-${functionIndex}-${fn.start}`,
        category: 'Missing access control',
        severity: 'High',
        functionName: fn.name,
        line: fn.start,
        snippet: originalLines[fn.start - 1]?.trim() || `function ${fn.name}(...)`,
        explanation: `Anyone may be able to call ${fn.name}(). This sensitive function has no recognizable access modifier or nearby sender check.`,
        fix: 'Restrict the function with an established role modifier, or require msg.sender to match the intended authorized account.',
      });
    }

    const bodyLines = fn.body.split('\n');
    const callPattern = /(?:\.call\s*(?:\{[^}]*\})?\s*\(|\.(?:transfer|send)\s*\()/;
    let callLine = -1;
    let callEnd = -1;
    for (let i = 0; i < bodyLines.length; i += 1) {
      const match = callPattern.exec(bodyLines[i]);
      if (match) {
        callLine = i;
        callEnd = match.index + match[0].length;
        break;
      }
    }
    const laterSameLineUpdate = callLine >= 0 && hasStateUpdate(bodyLines[callLine].slice(callEnd), stateNames);
    if (callLine >= 0 && (laterSameLineUpdate || hasRelatedStateUpdate(bodyLines, callLine + 1, stateNames))) {
      // Call line is reported, while a later state write is the ordering signal.
      const absoluteLine = fn.start + callLine;
      const transferLine = originalLines[absoluteLine - 1]?.trim() || bodyLines[callLine].trim();
      results.push({
        id: `reentrancy-${functionIndex}-${absoluteLine}`,
        category: 'Reentrancy pattern',
        severity: 'Critical',
        functionName: fn.name,
        line: absoluteLine,
        snippet: transferLine,
        explanation: 'An external call appears before a later state update. A recipient may call back into this function before accounting is updated.',
        fix: 'Apply checks-effects-interactions: update balances and other state before the external call. Consider a reentrancy guard as an additional layer.',
      });
    }
  });

  return results.sort((a, b) => a.line - b.line || a.category.localeCompare(b.category));
}
