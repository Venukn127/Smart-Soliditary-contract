import { useMemo, useRef, useState } from 'react';
import { AlertTriangle, Clipboard, Code2, Download, FileCode2, LogOut, ScanSearch, ShieldCheck } from 'lucide-react';
import { scanSolidity, type Finding, type Severity } from './lib/scanner';
import { Link, Redirect, Route, Switch, useLocation } from 'wouter';
import LandingPage from './pages/landing';
import AuthPage from './pages/auth';
import { AuthProvider, useAuth } from './lib/auth-context';

const VULNERABLE_SAMPLE = `// Example only — intentionally unsafe
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

const SAFER_SAMPLE = `// Example only — a clearer set of basic safeguards
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

const severities: Severity[] = ['Critical', 'High', 'Medium', 'Low'];

function ScannerApp() {
  const { user, signOut } = useAuth();
  const [, navigate] = useLocation();
  const [source, setSource] = useState('');
  const [findings, setFindings] = useState<Finding[] | null>(null);
  const [scannedSource, setScannedSource] = useState('');
  const [inputError, setInputError] = useState('');
  const [feedback, setFeedback] = useState('');
  const lineNumbersRef = useRef<HTMLPreElement>(null);
  const lines = useMemo(() => Math.max(1, source.split('\n').length), [source]);
  const counts = useMemo(
    () => Object.fromEntries(severities.map((severity) => [severity, findings?.filter((item) => item.severity === severity).length ?? 0])) as Record<Severity, number>,
    [findings],
  );
  const isStale = findings !== null && source !== scannedSource;

  function loadSample(code: string) {
    setSource(code);
    setInputError('');
    setFindings(null);
    setScannedSource('');
  }

  function runScan() {
    if (!source.trim()) {
      setInputError('Add Solidity source or load a sample before scanning.');
      setFindings(null);
      return;
    }
    setInputError('');
    setFindings(scanSolidity(source));
    setScannedSource(source);
  }

  function makeReport(): string {
    const reportLines = [
      'CONTRACT UNDER THE MICROSCOPE — LOCAL HEURISTIC REPORT',
      `Scanned source: ${source.split('\n').length} lines`,
      `Summary: ${severities.map((severity) => `${severity}: ${counts[severity]}`).join(' | ')}`,
      '',
      'Heuristic only. This scanner can miss issues and create false alarms. It is not a security audit; no findings does not mean safe.',
      '',
      ...(findings?.length ? findings.map((item, index) =>
        `${index + 1}. ${item.category} [${item.severity}]\nFunction: ${item.functionName} · Line ${item.line}\n${item.explanation}\nSnippet: ${item.snippet}\nSuggested fix: ${item.fix}`,
      ) : ['No findings from these limited checks.']),
    ];
    return reportLines.join('\n');
  }

  function showFeedback(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(''), 2800);
  }

  function downloadReport() {
    if (!findings) return;
    const file = new Blob([makeReport()], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'contract-microscope-report.txt';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showFeedback('Report downloaded');
  }

  async function copyReport() {
    if (!findings) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(makeReport());
      showFeedback('Report copied to clipboard');
    } catch {
      downloadReport();
      showFeedback('Clipboard unavailable — report downloaded instead');
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand" data-testid="brand-product">
          <span className="brand-mark"><ScanSearch size={19} strokeWidth={1.8} /></span>
          <span className="brand-name">Smart Contract Scanner<small>Solidity pattern scanner</small></span>
        </div>
        <div className="scanner-account"><div className="top-note"><i aria-hidden="true" /> Runs locally in your browser</div><span className="auth-user">{user?.email}</span><button type="button" className="signout-btn" onClick={async () => { const error = await signOut(); if (error) showFeedback(error); else navigate('/login'); }}><LogOut size={13} /> Sign out</button></div>
      </header>

      <main className="main-wrap">
        <section className="intro">
          <div>
            <div className="eyebrow">A first-pass source review</div>
            <h1>Look closer.<br />Learn what to look for.</h1>
            <p className="intro-copy">Paste a Solidity contract to explore a few common access-control and reentrancy warning patterns. Built to help you learn, not to certify a contract.</p>
          </div>
          <aside className="scope-card">
            <strong>Small checks. Clear limits.</strong>
            Looks for a short list of function names, familiar authorization signals, and external calls followed by state updates.
          </aside>
        </section>

        <section className="scanner-grid" aria-label="Solidity scanner">
          <div className="panel">
            <div className="panel-head">
              <div className="panel-title"><span className="step">01 / SOURCE</span> Contract source</div>
              <span className="source-meta" data-testid="text-source-lines">{lines} {lines === 1 ? 'line' : 'lines'}</span>
            </div>
            <div className="editor-toolbar">
              <span className="source-meta">Try an example</span>
              <div className="sample-actions">
                <button type="button" className="sample-btn danger" onClick={() => loadSample(VULNERABLE_SAMPLE)} data-testid="button-load-vulnerable">Load vulnerable</button>
                <button type="button" className="sample-btn" onClick={() => loadSample(SAFER_SAMPLE)} data-testid="button-load-safer">Load safer</button>
              </div>
            </div>
            <div className="editor-wrap">
              <pre className="line-numbers" ref={lineNumbersRef} aria-hidden="true" data-testid="source-line-numbers">{Array.from({ length: lines }, (_, i) => i + 1).join('\n')}</pre>
              <textarea
                className="code-input"
                value={source}
                onChange={(event) => { setSource(event.target.value); if (inputError) setInputError(''); }}
                onScroll={(event) => { if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop; }}
                spellCheck={false}
                wrap="off"
                aria-label="Solidity source code"
                placeholder={'// Paste your Solidity contract here\npragma solidity ^0.8.20;\n\ncontract Example {\n    // Your code...'}
                data-testid="input-solidity-source"
              />
            </div>
            <div className="editor-foot">
              <span>Plain text · nothing leaves this page</span>
              <span>Solidity</span>
            </div>
            <div className="editor-actions">
              <button type="button" className="subtle-link" onClick={() => { setSource(''); setFindings(null); setScannedSource(''); setInputError(''); }} data-testid="button-clear-source">Clear source</button>
              {inputError && <span className="error-note" role="alert" data-testid="status-input-error">{inputError}</span>}
              <button type="button" className="primary-btn" onClick={runScan} data-testid="button-scan-contract"><ScanSearch size={16} /> Scan contract <span aria-hidden="true">→</span></button>
            </div>
          </div>

          <div className="panel results-panel">
            <div className="panel-head">
              <div className="panel-title"><span className="step">02 / REVIEW</span> Findings</div>
              <span className="source-meta" data-testid="status-scan-state">{findings === null ? 'Awaiting scan' : isStale ? 'Source changed' : 'Scan complete'}</span>
            </div>
            <div className="results-body" data-testid="results-region">
              {findings === null ? (
                <div className="initial-state" data-testid="state-results-unscanned">
                  <div className="initial-icon"><FileCode2 size={23} strokeWidth={1.6} /></div>
                  <h3>Your review starts here</h3>
                  <p>Load either example or paste your own source, then scan to see the patterns this tool recognizes.</p>
                </div>
              ) : findings.length === 0 ? (
                <>
                  <div className="severity-grid" data-testid="severity-counts">
                    {severities.map((severity) => <div className={`severity-box ${severity.toLowerCase()}`} key={severity} data-testid={`count-${severity.toLowerCase()}`}><strong>{counts[severity]}</strong><span>{severity}</span></div>)}
                  </div>
                  <div className="clear-state" data-testid="state-no-findings">
                    <div className="clear-mark"><ShieldCheck size={24} /></div>
                    <h3>No findings from these checks</h3>
                    <p>The selected patterns were not recognized in this source. That is not a guarantee that the contract is safe.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="severity-grid" data-testid="severity-counts">
                    {severities.map((severity) => <div className={`severity-box ${severity.toLowerCase()}`} key={severity} data-testid={`count-${severity.toLowerCase()}`}><strong>{counts[severity]}</strong><span>{severity}</span></div>)}
                  </div>
                  <div className="result-summary"><strong>{findings.length} {findings.length === 1 ? 'pattern to review' : 'patterns to review'}</strong><span>{isStale ? 'SOURCE HAS CHANGED' : 'SORTED BY LINE'}</span></div>
                  <div className="finding-list">
                    {findings.map((finding) => (
                      <article className="finding" key={finding.id} data-testid={`finding-${finding.id}`}>
                        <div className="finding-top">
                          <span className="finding-kind">{finding.category}</span>
                          <span className="severity-pill">{finding.severity}</span>
                        </div>
                        <div className="finding-location" data-testid={`finding-location-${finding.id}`}>{finding.functionName}() · line {finding.line}</div>
                        <p>{finding.explanation}</p>
                        <code>{finding.snippet}</code>
                        <div className="fix"><b>Consider:</b> {finding.fix}</div>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="results-footer">
              <span data-testid="text-findings-total">{findings === null ? 'No scan yet' : `${findings.length} ${findings.length === 1 ? 'finding' : 'findings'} · local analysis`}</span>
              <div style={{ display: 'flex', gap: 7 }}>
                <button type="button" className="report-btn" onClick={copyReport} disabled={findings === null} data-testid="button-copy-report"><Clipboard size={13} /> Copy report</button>
                <button type="button" className="report-btn" onClick={downloadReport} disabled={findings === null} aria-label="Download report" data-testid="button-download-report"><Download size={13} /> Download</button>
              </div>
            </div>
          </div>
        </section>

        <aside className="notice" data-testid="notice-heuristic-limits">
          <AlertTriangle size={16} />
          <div><strong>Heuristic only.</strong> This scanner can miss issues and create false alarms. It is not a security audit, and no findings does not mean a contract is safe. Always get a qualified review before deployment.</div>
        </aside>
        <div className="footer-line"><span>LOCAL SCAN · NO SOURCE UPLOAD</span><span><Code2 size={11} style={{ verticalAlign: '-2px', marginRight: 5 }} />A learning aid for Solidity builders</span></div>
      </main>
      {feedback && <div className="toast" role="status" data-testid="status-report-feedback">{feedback}</div>}
    </div>
  );
}

function ProtectedScanner() {
  const { user, loading, configured } = useAuth();
  if (!configured) {
    return <main className="auth-config-page"><span className="marketing-mark"><ScanSearch size={19} /></span><h1>Finish connecting Supabase</h1><p>Add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> to your Replit Secrets, then restart the app.</p><Link className="hero-primary" href="/login">Go to login <span aria-hidden="true">→</span></Link></main>;
  }
  if (loading) return <div className="auth-loading" role="status">Restoring your sign-in…</div>;
  if (!user) return <Redirect to="/login" />;
  return <ScannerApp />;
}

function App() {
  return (
    <AuthProvider>
      <Switch>
        <Route path="/" component={LandingPage} />
        <Route path="/login">{() => <AuthPage mode="login" />}</Route>
        <Route path="/register">{() => <AuthPage mode="register" />}</Route>
        <Route path="/scan" component={ProtectedScanner} />
        <Route component={LandingPage} />
      </Switch>
    </AuthProvider>
  );
}

export default App;
