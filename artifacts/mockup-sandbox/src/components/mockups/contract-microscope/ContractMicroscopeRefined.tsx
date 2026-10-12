import { useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Clipboard, Code2, Download, FileCode2, ScanSearch, ShieldCheck } from "lucide-react";
import "./ContractMicroscopeRefined.css";

type Severity = "Critical" | "High" | "Medium" | "Low";
type Finding = { id: string; category: string; severity: Severity; functionName: string; line: number; snippet: string; explanation: string; fix: string };

const VULNERABLE = `// Example only — intentionally unsafe
pragma solidity ^0.8.20;

contract PocketVault {
    mapping(address => uint256) public balances;
    uint256 public totalDeposited;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        totalDeposited += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(amount > 0, "zero amount");
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "payment failed");
        balances[msg.sender] -= amount;
        totalDeposited -= amount;
    }

    function mint(address recipient, uint256 amount) external {
        balances[recipient] += amount;
    }
}`;
const SAFER = `// Example only — a clearer set of basic safeguards
pragma solidity ^0.8.20;

contract GardenVault {
    mapping(address => uint256) public balances;
    uint256 public totalDeposited;
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "owner only");
        _;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
        totalDeposited += msg.value;
    }

    function withdraw(uint256 amount) external onlyOwner {
        require(balances[msg.sender] >= amount, "not enough");
        balances[msg.sender] -= amount;
        totalDeposited -= amount;
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "payment failed");
    }

    function mint(address recipient, uint256 amount) external onlyOwner {
        balances[recipient] += amount;
    }
}`;
const LEVELS: Severity[] = ["Critical", "High", "Medium", "Low"];

function scan(source: string): Finding[] {
  const lines = source.split("\n");
  const stateNames = [...source.matchAll(/\b(?:uint(?:\d+)?|address|bool|mapping\s*\([^;]+?\))\s+(?:public\s+|private\s+|internal\s+)?([A-Za-z_$][\w$]*)\s*(?:=|;)/g)].map((match) => match[1]);
  const results: Finding[] = [];
  const re = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\([^)]*\)[^{]*\{([\s\S]*?)\n\s*\}/g;
  let match: RegExpExecArray | null;
  let idx = 0;
  while ((match = re.exec(source))) {
    const name = match[1];
    const body = match[2];
    const start = source.slice(0, match.index).split("\n").length;
    const header = match[0].slice(0, match[0].indexOf("{"));
    const guarded = /\bonlyOwner|onlyRole|onlyAdmin|auth\b/i.test(header) || /\brequire\s*\([^)]*msg\.sender/.test(body);
    if (/^(withdraw|mint|pause|setOwner|setAdmin)$/i.test(name) && !guarded) {
      results.push({ id: `access-${idx}`, category: "Missing access control", severity: "High", functionName: name, line: start, snippet: lines[start - 1]?.trim() ?? "", explanation: `Anyone may be able to call ${name}(). This sensitive function has no recognizable access modifier or sender check.`, fix: "Restrict the function with an established role modifier, or require msg.sender to match the intended account." });
    }
    const call = body.match(/(?:\.call\s*(?:\{[^}]*\})?\s*\(|\.(?:transfer|send)\s*\()/);
    if (call && stateNames.some((state) => new RegExp(`\\b${state}\\b(?:\\s*\\[[^\\]]+\\])?\\s*(?:\\+\\+|--|[+\\-*/]?=)`).test(body.slice(call.index!)))) {
      const callLine = start + body.slice(0, call.index).split("\n").length;
      results.push({ id: `reentrancy-${idx}`, category: "Reentrancy pattern", severity: "Critical", functionName: name, line: callLine, snippet: lines[callLine - 1]?.trim() ?? "", explanation: "An external call appears before a later state update. A recipient may call back before accounting is updated.", fix: "Apply checks-effects-interactions: update state before the external call. Consider a reentrancy guard as an additional layer." });
    }
    idx += 1;
  }
  return results.sort((a, b) => a.line - b.line);
}

export default function ContractMicroscopeRefined() {
  const [source, setSource] = useState("");
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [scannedSource, setScannedSource] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const linesRef = useRef<HTMLPreElement>(null);
  const lineCount = useMemo(() => Math.max(1, source.split("\n").length), [source]);
  const counts = useMemo(() => Object.fromEntries(LEVELS.map((level) => [level, findings?.filter((item) => item.severity === level).length ?? 0])) as Record<Severity, number>, [findings]);
  const stale = findings !== null && source !== scannedSource;

  function loadSample(text: string) { setSource(text); setFindings(null); setScannedSource(""); setError(""); }
  function runScan() {
    if (!source.trim()) { setError("Add Solidity source or load an example first."); setFindings(null); return; }
    setError(""); setFindings(scan(source)); setScannedSource(source);
  }
  function report() {
    return [
      "CONTRACT UNDER THE MICROSCOPE — LOCAL HEURISTIC REPORT",
      `Scanned source: ${source.split("\n").length} lines`,
      `Summary: ${LEVELS.map((level) => `${level}: ${counts[level]}`).join(" | ")}`,
      "",
      "Heuristic only. This scanner can miss issues and create false alarms. It is not a security audit.",
      "",
      ...(findings?.length ? findings.map((item, index) => `${index + 1}. ${item.category} [${item.severity}]\nFunction: ${item.functionName} · Line ${item.line}\n${item.explanation}\nSnippet: ${item.snippet}\nSuggested fix: ${item.fix}`) : ["No findings from these limited checks."]),
    ].join("\n");
  }
  function showToast(message: string) { setToast(message); window.setTimeout(() => setToast(""), 2600); }
  function download() {
    if (!findings) return;
    const url = URL.createObjectURL(new Blob([report()], { type: "text/plain;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "contract-microscope-report.txt"; anchor.click(); URL.revokeObjectURL(url); showToast("Report downloaded");
  }
  async function copy() {
    if (!findings) return;
    try { await navigator.clipboard.writeText(report()); showToast("Report copied to clipboard"); }
    catch { download(); showToast("Clipboard unavailable — report downloaded instead"); }
  }

  return (
    <div className="cmx">
      <header className="cmx-bar">
        <div className="cmx-brand"><span className="cmx-mark"><ScanSearch size={18} strokeWidth={1.8} /></span><span><strong>Contract Under the Microscope</strong><small>Solidity pattern scanner</small></span></div>
        <div className="cmx-private"><i /> Runs locally in your browser</div>
      </header>
      <main className="cmx-main">
        <section className="cmx-intro">
          <div><div className="cmx-kicker"><span /> A first-pass source review</div><h1>Look closer.<br />Learn what to look for.</h1><p>Explore a few common access-control and reentrancy warning patterns. A practical learning aid—not a contract certification.</p></div>
          <aside className="cmx-scope"><b>Small checks. Clear limits.</b>Looks for familiar function names, authorization signals, and external calls made before state updates.</aside>
        </section>
        <section className="cmx-workbench" aria-label="Solidity scanner">
          <div className="cmx-panel">
            <div className="cmx-panel-head"><div className="cmx-title"><span className="cmx-step">01 / SOURCE</span> Contract source</div><span className="cmx-meta">{lineCount} {lineCount === 1 ? "line" : "lines"}</span></div>
            <div className="cmx-toolbar"><span className="cmx-hint">Start with an example</span><div className="cmx-samples"><button className="cmx-chip cmx-chip-alert" onClick={() => loadSample(VULNERABLE)} type="button">Load vulnerable</button><button className="cmx-chip" onClick={() => loadSample(SAFER)} type="button">Load safer</button></div></div>
            <div className="cmx-editor">
              <pre className="cmx-lines" ref={linesRef} aria-hidden="true">{Array.from({ length: lineCount }, (_, index) => index + 1).join("\n")}</pre>
              <textarea className="cmx-source" value={source} onChange={(event) => { setSource(event.target.value); if (error) setError(""); }} onScroll={(event) => { if (linesRef.current) linesRef.current.scrollTop = event.currentTarget.scrollTop; }} spellCheck={false} wrap="off" aria-label="Solidity source code" placeholder={"// Paste your Solidity contract here\npragma solidity ^0.8.20;\n\ncontract Example {\n    // Your code..."} />
            </div>
            <div className="cmx-editor-foot"><span>Plain text · nothing leaves this page</span><span>Solidity</span></div>
            <div className="cmx-actions"><button className="cmx-clear" type="button" onClick={() => { setSource(""); setFindings(null); setScannedSource(""); setError(""); }}>Clear source</button>{error && <span className="cmx-error" role="alert">{error}</span>}<button className="cmx-scan" type="button" onClick={runScan}><ScanSearch size={15} /> Scan contract <span aria-hidden="true">→</span></button></div>
          </div>
          <div className="cmx-panel cmx-results">
            <div className="cmx-panel-head"><div className="cmx-title"><span className="cmx-step">02 / REVIEW</span> Findings</div><span className="cmx-meta">{findings === null ? "Awaiting scan" : stale ? "Source changed" : "Scan complete"}</span></div>
            <div className="cmx-result-body">
              {findings === null ? <div className="cmx-await"><div className="cmx-await-icon"><FileCode2 size={21} strokeWidth={1.6} /></div><h3>Your review starts here</h3><p>Load either example or paste your own source, then scan to see which patterns this tool recognizes.</p></div> : <>
                <div className="cmx-counts">{LEVELS.map((level) => <div className={`cmx-count ${level.toLowerCase()}`} key={level}><strong>{counts[level]}</strong><span>{level}</span></div>)}</div>
                {findings.length === 0 ? <div className="cmx-clear-state"><div className="cmx-clear-mark"><ShieldCheck size={22} /></div><h3>No findings from these checks</h3><p>The selected patterns were not recognized. That is not a guarantee that the contract is safe.</p></div> : <>
                  <div className="cmx-summary"><b>{findings.length} {findings.length === 1 ? "pattern" : "patterns"} to review</b><span>{stale ? "Source has changed" : "Sorted by line"}</span></div>
                  <div className="cmx-findings">{findings.map((finding) => <article className="cmx-finding" key={finding.id}>
                    <div className="cmx-finding-top"><span className="cmx-finding-kind">{finding.category}</span><span className="cmx-severity">{finding.severity}</span></div>
                    <div className="cmx-location">{finding.functionName}() · line {finding.line}</div><p>{finding.explanation}</p><code>{finding.snippet}</code><div className="cmx-fix"><b>Consider:</b> {finding.fix}</div>
                  </article>)}</div>
                </>}
              </>}
            </div>
            <div className="cmx-result-foot"><span>{findings === null ? "No scan yet" : `${findings.length} ${findings.length === 1 ? "finding" : "findings"} · local analysis`}</span><div className="cmx-report-actions"><button className="cmx-report" type="button" disabled={findings === null} onClick={copy}><Clipboard size={12} /> Copy report</button><button className="cmx-report" type="button" disabled={findings === null} onClick={download}><Download size={12} /> Download</button></div></div>
          </div>
        </section>
        <aside className="cmx-notice"><AlertTriangle size={15} /><div><b>Heuristic only.</b> This scanner can miss issues and create false alarms. It is not a security audit; no findings does not mean a contract is safe. Always get a qualified review before deployment.</div></aside>
        <footer className="cmx-footer"><span>LOCAL SCAN · NO SOURCE UPLOAD</span><span><Code2 size={11} style={{ verticalAlign: "-2px", marginRight: 5 }} />A learning aid for Solidity builders</span></footer>
      </main>
      {toast && <div className="cmx-toast" role="status"><Check size={13} style={{ verticalAlign: "-2px", marginRight: 7 }} />{toast}</div>}
    </div>
  );
}
