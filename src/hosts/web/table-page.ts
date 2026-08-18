/**
 * Minimal table shell. Load in an iframe only AFTER top-level GitHub OAuth.
 * Buttons call WebTableHost methods via a bridge the page host injects —
 * no betting/dealer imports in the page itself.
 */
export const TABLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>holdem table</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 1rem; background: #0b1a12; color: #e8f5e9; }
    button { margin: 0.25rem; padding: 0.4rem 0.75rem; }
    #board, #hole, #status { margin: 0.5rem 0; }
    .hosted button.act { opacity: 0.35; pointer-events: none; }
  </style>
</head>
<body>
  <p>Login must happen in the <strong>top-level</strong> window (not this iframe).</p>
  <div id="status">waiting for bridge</div>
  <div id="board"></div>
  <div id="hole"></div>
  <div id="actions"></div>
  <script>
    /* bridge: window.__holdem = { view, clickAct, takeBack, setHosted, advanceStreet } */
    function render(v) {
      document.body.classList.toggle('hosted', v.you.control === 'hosted');
      document.getElementById('status').textContent =
        'seat ' + v.seat + ' @ ' + v.street + ' pot=' + v.pot + ' control=' + v.you.control;
      document.getElementById('board').textContent = 'board: ' + JSON.stringify(v.board);
      document.getElementById('hole').textContent = 'hole: ' + JSON.stringify(v.hole);
      const box = document.getElementById('actions');
      box.innerHTML = '';
      if (v.you.control === 'hosted') {
        const b = document.createElement('button');
        b.textContent = 'take-back';
        b.onclick = () => window.__holdem.takeBack().then(render);
        box.appendChild(b);
        return;
      }
      for (const a of v.legal) {
        const b = document.createElement('button');
        b.className = 'act';
        b.textContent = a.kind;
        b.onclick = () => window.__holdem.clickAct({ kind: a.kind, amount: a.min }).then(render);
        box.appendChild(b);
      }
      const host = document.createElement('button');
      host.textContent = 'host to AI';
      host.onclick = () => window.__holdem.setHosted().then(render);
      box.appendChild(host);
      const next = document.createElement('button');
      next.textContent = 'next street';
      next.onclick = () => window.__holdem.advanceStreet().then(render);
      box.appendChild(next);
    }
    if (window.__holdem && window.__holdem.view) {
      window.__holdem.view().then(render);
    }
  </script>
</body>
</html>
`;
