import { ArrowDown, ArrowRight, Check, Code2, Github, ScanSearch, Shield, ShieldAlert, Sparkles } from 'lucide-react';
import { Link } from 'wouter';

export default function LandingPage() {
  return (
    <div className="marketing-shell">
      <header className="marketing-nav">
        <Link href="/" className="marketing-brand"><span className="marketing-mark"><ScanSearch size={19} /></span><span>Smart Contract Scanner<small>Solidity security, made clearer</small></span></Link>
        <nav aria-label="Main navigation"><a href="#how-it-works">How it works</a><a href="#features">Features</a><Link className="nav-login" href="/login">Log in</Link><Link className="nav-cta" href="/register">Create account <ArrowRight size={15} /></Link></nav>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-copy">
            <div className="hero-kicker"><span /> A clearer first look at Solidity</div>
            <h1>Find the weak spots.<br /><em>Learn as you scan.</em></h1>
            <p>Explore common smart contract risk patterns with a simple, local scanner built for Solidity builders. Paste a contract, review the signals, and understand what to investigate next.</p>
            <div className="hero-actions"><Link className="hero-primary" href="/register">Get started <ArrowRight size={17} /></Link><Link className="hero-secondary" href="/scan"><span className="play-icon">▷</span> Try the scanner</Link></div>
            <div className="hero-proof"><span className="proof-icon"><Shield size={15} /></span><span>Runs in your browser</span><i /><span>No source upload</span><i /><span>Free to explore</span></div>
          </div>
          <div className="hero-visual" aria-label="Illustration of a contract scan report">
            <div className="orbit orbit-one" /><div className="orbit orbit-two" />
            <div className="scan-card">
              <div className="scan-card-top"><div className="scan-file"><span className="file-icon"><Code2 size={16} /></span><span><b>TokenVault.sol</b><small>Solidity source · 128 lines</small></span></div><span className="scan-live"><i /> LOCAL SCAN</span></div>
              <div className="scan-score-row"><div className="score-ring"><span>03</span><small>signals</small></div><div><div className="scan-label">FIRST-PASS REVIEW</div><h3>Worth a closer look</h3><p>Review these patterns before deployment.</p></div></div>
              <div className="finding-preview"><span className="finding-symbol"><ShieldAlert size={16} /></span><span><b>External call before state update</b><small>withdraw() · line 42</small></span><span className="finding-severity">HIGH</span></div>
              <div className="finding-preview"><span className="finding-symbol muted"><ScanSearch size={16} /></span><span><b>Authorization signal missing</b><small>setFee() · line 76</small></span><span className="finding-severity medium">MED</span></div>
              <div className="finding-preview"><span className="finding-symbol muted"><Sparkles size={16} /></span><span><b>Mint access needs review</b><small>mint() · line 103</small></span><span className="finding-severity medium">MED</span></div>
              <div className="scan-card-foot"><span><Check size={13} /> Source stays in this browser</span><span>HEURISTIC REPORT</span></div>
            </div>
            <div className="float-tag"><span>✳</span> Understand every finding</div>
            <div className="visual-caption">A starting point for a more thoughtful review.</div>
          </div>
          <a className="scroll-cue" href="#features"><ArrowDown size={14} /> SCROLL TO EXPLORE</a>
        </section>

        <section className="feature-band" id="features">
          <div className="section-heading"><span className="section-overline">BUILT FOR THE FIRST PASS</span><h2>Security signals, without the noise.</h2><p>Get a useful starting point for code review, with clear notes about what the scanner can and cannot tell you.</p></div>
          <div className="feature-grid">
            <article className="feature-card"><span className="feature-number">01</span><div className="feature-icon green"><ScanSearch size={20} /></div><h3>Scan right in your browser</h3><p>Paste Solidity source and explore a few common access-control and reentrancy patterns. Your code stays on this page.</p></article>
            <article className="feature-card"><span className="feature-number">02</span><div className="feature-icon orange"><ShieldAlert size={20} /></div><h3>See what deserves a look</h3><p>Findings point to functions and lines, with a short explanation and a practical suggestion for further review.</p></article>
            <article className="feature-card"><span className="feature-number">03</span><div className="feature-icon blue"><Code2 size={20} /></div><h3>Learn with real examples</h3><p>Try intentionally vulnerable and safer sample contracts to see which signals the scanner recognizes.</p></article>
          </div>
        </section>

        <section className="how-section" id="how-it-works"><div><span className="section-overline">A SIMPLE WORKFLOW</span><h2>From source to<br />a smarter review.</h2><p>Use the scanner to build intuition, then bring those questions into a thorough human review.</p><Link className="how-link" href="/scan">Explore the scanner <ArrowRight size={15} /></Link></div><div className="steps-list"><div className="how-step"><span>01</span><div><b>Bring your Solidity source</b><p>Paste a contract or load one of the built-in examples.</p></div><Check size={17} /></div><div className="how-step"><span>02</span><div><b>Run a local pattern scan</b><p>Review a short list of heuristic signals in your browser.</p></div><Check size={17} /></div><div className="how-step"><span>03</span><div><b>Investigate with care</b><p>Use findings as questions for a proper security review.</p></div><Check size={17} /></div></div></section>

        <section className="closing-cta"><div className="closing-decoration">✳</div><span className="section-overline">START WITH CURIOSITY</span><h2>Take a closer look at your contract.</h2><p>Explore the scanner and learn what to investigate next.</p><Link className="hero-primary" href="/register">Create your free account <ArrowRight size={16} /></Link></section>
      </main>
      <footer className="marketing-footer"><Link href="/" className="footer-brand"><span className="marketing-mark"><ScanSearch size={16} /></span> Smart Contract Scanner</Link><span>LOCAL SCAN · NO SOURCE UPLOAD</span><a href="https://github.com/Venukn127/Smart-Soliditary-contract" target="_blank" rel="noreferrer" aria-label="GitHub repository"><Github size={17} /></a></footer>
    </div>
  );
}
