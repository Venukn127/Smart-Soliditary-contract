# Contract Under the Microscope

A beginner-friendly Solidity pattern scanner built for a national hackathon. Paste a Solidity contract into the app to check for a few common access-control and reentrancy warning patterns.

> **Important:** This is a heuristic tool, not a security audit. It can miss issues or report false alarms. No findings does **not** mean a contract is safe.

## Features

- Paste Solidity source code into the editor and scan it in the browser
- Load a vulnerable example or a safer example
- See findings grouped by severity, with the function, line, code snippet, explanation, and suggested fix
- Copy or download a scan report
- Use the responsive single-page interface on desktop or mobile

## What it checks

- **Access control:** Looks for sensitive functions such as `withdraw`, `mint`, `pause`, `upgradeTo`, `setOwner`, or `setAdmin` that lack a recognized authorization modifier or a `require` check involving `msg.sender`.
- **Reentrancy patterns:** Looks for an external call or value transfer that appears before a later state update in the same function.

These checks only recognize limited code patterns. They do not replace a Solidity compiler, a full security toolchain, or review by a qualified auditor.

## Run locally

This project is part of a pnpm workspace. From the repository root:

```sh
pnpm install
pnpm --filter @workspace/contract-microscope run dev
```

Open the local address printed in the terminal.

To create a production build:

```sh
pnpm --filter @workspace/contract-microscope run build
```

## Tech

- React
- TypeScript
- Vite
- Solidity pattern checks implemented in TypeScript

## Try the examples

1. Start the app.
2. Choose **Load vulnerable** or **Load safer**.
3. Select **Scan contract** to view the results.

## Disclaimer

This project is for learning and demonstration purposes only. Do not rely on it to determine whether a smart contract is secure. Get an independent security review before deploying a contract.
