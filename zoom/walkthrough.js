// ---------- narrated walkthrough: plays the voiceover and switches tabs on the audio clock ----------
// Runs inside the same scope as the dashboard, so it calls the real setTab(). Times come from the word-level transcript of the voiceover.
const WT = (() => {
  const LAYERS = [['Data layer', 5.7], ['Intelligence layer', 36.3], ['Execution layer', 73.8]];
  // [start seconds, tab id, layer index (-1 = intro), tab name, what the tab shows]
  const CUES = [
    [0, 'command', -1, 'CRO Hub', 'The answer first: where revenue is heading and the next moves.'],
    [5.7, 'ingress', 0, 'Ingress and Resolution', 'Feeds from Salesforce, Gong, monday.com and Grafana, matched to one customer (39% before, 99% after).'],
    [31.2, 'engine', 0, 'Account Engine', 'The 40 accounts, each with its deals, calls, project status, usage and risk flags in one place.'],
    [36.3, 'revenue', 1, 'Revenue and Uplift', '$480M in play, $185M committed, $210M forecast, and the $24M uplift above plan.'],
    [57.3, 'regprod', 1, 'Region and Product', 'What Zoom sells in each region, and where rivals show up.'],
    [62.2, 'forecast', 1, 'Forecast', 'Why the forecast moves.'],
    [62.95, 'sellers', 1, 'Sellers', 'Who is on track and who needs help.'],
    [63.9, 'accounts', 1, 'Accounts', 'Which accounts to expand or repair.'],
    [64.45, 'pricing', 1, 'Pricing and promotions', 'Where price and discounting move the number.'],
    [65.0, 'compete', 1, 'Compete', 'Which rivals are in which deals.'],
    [68.3, 'levers', 1, 'Without vs with Databook', 'Hiring new reps against lifting the reps you already have.'],
    [73.8, 'guided', 2, 'Guided Selling', 'A next best move for every deal, and the risks that hurt win rates.'],
    [85.4, 'coach', 2, 'Seller Coach', 'A step-by-step meeting prep for one seller.'],
    [88.8, 'studio', 2, 'Sales Ops Studio', 'A plain-English request compiled into scoring rules.']
  ];
  // caption lines [start seconds, text]
  const CAPS = [
    [0, 'This platform works in three layers: data, intelligence, and execution.'],
    [5.7, 'First, the data layer.'],
    [7.6, 'Ingress and Resolution pulls in deals from Salesforce, calls from Gong, project status from monday.com, and product usage from Grafana, then matches them to one customer, ninety-nine percent of the time instead of thirty-nine.'],
    [22.3, 'The process changes from four competing versions of the truth to a single customer record, and teams stop arguing about whose number is right.'],
    [31.2, 'Account Engine then holds each account\'s full story in one place.'],
    [36.3, 'Next, the intelligence layer.'],
    [38.5, 'Revenue and Uplift shows four hundred eighty million dollars in play, one hundred eighty-five committed, two hundred ten forecast, and a twenty-four million dollar uplift.'],
    [48.9, 'Uplift means extra revenue above plan that traces back to a specific action, so leaders start judging actions by dollars.'],
    [57.3, 'Region and Product shows what sells where, and where rivals show up.'],
    [61.6, 'The forecast, sellers, accounts, pricing, and compete tabs explain why numbers move.'],
    [68.3, 'Without versus With compares hiring against coaching the reps you already have.'],
    [73.8, 'Finally, the execution layer.'],
    [75.9, 'Guided Selling gives every deal a next best move, and flags risks like relying on a single contact.'],
    [82.5, 'Reps follow a route instead of improvising.'],
    [85.4, 'Seller Coach prepares a meeting, step by step.'],
    [88.5, 'And Sales Ops Studio turns plain English into scoring rules, so changes ship without an engineering queue.'],
    [95.2, 'All numbers are simulated, to show the idea.']
  ];
  const at = (arr, t) => { let k = 0; for (let i = 0; i < arr.length; i++) if (arr[i][0] <= t + 0.05) k = i; return k; };
  const fmt = (s) => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const audio = new Audio();
  audio.preload = 'auto';
  audio.src = window.WT_AUDIO;
  let cue = -1, raf = 0, started = false, mini = false;
  const root = document.createElement('div');
  root.id = 'wt';
  root.innerHTML =
    '<div class="wt-start" id="wt-start" role="dialog" aria-modal="true" aria-labelledby="wt-st"><div class="wt-card">' +
      '<span class="wt-kick">Narrated walkthrough</span><h2 id="wt-st">Zoom CRO platform in 1 minute 38 seconds</h2>' +
      '<p>A voice walks through the tabs in three layers: data, intelligence and execution. The page switches tabs on its own. Turn your sound on.</p>' +
      '<div class="wt-row"><button class="wt-btn wt-go" id="wt-play0" type="button">Play walkthrough</button><button class="wt-link" id="wt-skip" type="button">Explore on my own</button></div>' +
    '</div></div>' +
    '<section class="wt-bar" id="wt-bar" aria-label="Walkthrough player" hidden>' +
      '<div class="wt-top"><div class="wt-layers" role="group" aria-label="Layers">' +
        LAYERS.map((l, i) => '<button type="button" class="wt-layer" data-l="' + i + '"><i></i>' + l[0].replace(' layer', '') + '<span class="wt-lay"> layer</span></button>').join('') +
      '</div><button type="button" class="wt-min" id="wt-min" aria-label="Collapse player" aria-expanded="true">−</button></div>' +
      '<div class="wt-body"><div class="wt-now"><b id="wt-tab"></b><span id="wt-shows"></span></div><p class="wt-cap" id="wt-cap" aria-live="off"></p></div>' +
      '<div class="wt-ctl">' +
        '<button type="button" class="wt-btn wt-pp" id="wt-pp" aria-label="Play">Play</button>' +
        '<button type="button" class="wt-ic" id="wt-prev" aria-label="Previous tab">‹</button><button type="button" class="wt-ic" id="wt-next" aria-label="Next tab">›</button>' +
        '<input type="range" id="wt-seek" min="0" max="1000" value="0" step="1" aria-label="Seek">' +
        '<span class="wt-time" id="wt-time">0:00 / 1:38</span>' +
        '<button type="button" class="wt-spd" id="wt-spd" aria-label="Playback speed">1×</button>' +
      '</div>' +
    '</section>';
  document.body.appendChild(root);
  const $w = (id) => document.getElementById(id);
  const dur = () => (isFinite(audio.duration) && audio.duration > 1 ? audio.duration : 97.84);

  function show(i) {
    const c = CUES[i];
    if (!c) return;
    if (i !== cue) { cue = i; try { if (S.tab !== c[1]) setTab(c[1]); } catch (e) {} }
    $w('wt-tab').textContent = c[3];
    $w('wt-shows').textContent = c[4];
    root.querySelectorAll('.wt-layer').forEach((b) => b.setAttribute('aria-current', String(+b.dataset.l === c[2])));
  }
  function paint() {
    const t = audio.currentTime;
    show(at(CUES, t));
    $w('wt-cap').textContent = CAPS[at(CAPS, t)][1];
    $w('wt-seek').value = Math.round((t / dur()) * 1000);
    $w('wt-time').textContent = fmt(t) + ' / ' + fmt(dur());
  }
  function tick() { paint(); if (!audio.paused) raf = requestAnimationFrame(tick); }
  function setPP() { const p = audio.paused; const b = $w('wt-pp'); b.textContent = audio.ended ? 'Replay' : p ? 'Play' : 'Pause'; b.setAttribute('aria-label', b.textContent); }
  function play() {
    $w('wt-start').hidden = true; $w('wt-bar').hidden = false; started = true;
    if (audio.ended) audio.currentTime = 0;
    const pr = audio.play(); if (pr && pr.catch) pr.catch(() => { setPP(); });
  }
  function seekTo(t) { audio.currentTime = Math.min(Math.max(0, t), dur() - 0.05); cue = -1; paint(); }

  audio.addEventListener('play', () => { setPP(); cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); });
  audio.addEventListener('pause', () => { setPP(); paint(); });
  audio.addEventListener('ended', () => { setPP(); paint(); });
  audio.addEventListener('seeked', paint);
  audio.addEventListener('loadedmetadata', paint);
  $w('wt-play0').addEventListener('click', play);
  $w('wt-skip').addEventListener('click', () => { $w('wt-start').hidden = true; $w('wt-bar').hidden = false; paint(); });
  $w('wt-pp').addEventListener('click', () => { if (audio.paused) play(); else audio.pause(); });
  $w('wt-seek').addEventListener('input', (e) => seekTo((e.target.value / 1000) * dur()));
  $w('wt-prev').addEventListener('click', () => { const i = at(CUES, audio.currentTime); seekTo(audio.currentTime - CUES[i][0] > 2 ? CUES[i][0] : CUES[Math.max(0, i - 1)][0]); });
  $w('wt-next').addEventListener('click', () => { const i = at(CUES, audio.currentTime); if (CUES[i + 1]) seekTo(CUES[i + 1][0]); });
  root.querySelectorAll('.wt-layer').forEach((b) => b.addEventListener('click', () => { seekTo(LAYERS[+b.dataset.l][1]); if (audio.paused) play(); }));
  $w('wt-spd').addEventListener('click', (e) => { const r = audio.playbackRate === 1 ? 1.25 : audio.playbackRate === 1.25 ? 1.5 : 1; audio.playbackRate = r; e.target.textContent = r + '×'; });
  $w('wt-min').addEventListener('click', (e) => { mini = !mini; $w('wt-bar').classList.toggle('mini', mini); e.target.textContent = mini ? '+' : '−'; e.target.setAttribute('aria-expanded', String(!mini)); e.target.setAttribute('aria-label', mini ? 'Expand player' : 'Collapse player'); });
  document.addEventListener('keydown', (e) => { if (!started || /^(INPUT|SELECT|TEXTAREA)$/.test((e.target.tagName || ''))) return; if (e.code === 'Space' && !/^BUTTON$/.test(e.target.tagName)) { e.preventDefault(); if (audio.paused) play(); else audio.pause(); } });
  paint();
  return { audio, seekTo };
})();
