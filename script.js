/* ========================================
   ChicoBet Casino - Lógica Principal
   Projeto educacional - Saldo fictício
======================================== */

// ===== ESTADO GLOBAL =====
const State = {
    balance: 10000,
    currentGame: null,
    init() {
        const saved = localStorage.getItem('chicobet_user_data');
        if (saved) {
            const data = JSON.parse(saved);
            this.balance = data.balance ?? 10000;
        }
        this.updateBalance();
    },
    save() { localStorage.setItem('chicobet_user_data', JSON.stringify({ balance: this.balance })); },
    formatCurrency(val) { return 'R$ ' + val.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.'); },
    updateBalance() { document.getElementById('balance').textContent = this.formatCurrency(this.balance); },
    canBet(amount) { return amount > 0 && amount <= this.balance; },
    debit(amount) { this.balance -= amount; this.updateBalance(); this.save(); },
    credit(amount) { this.balance += amount; this.updateBalance(); this.save(); },
    reset() { this.balance = 10000; this.updateBalance(); this.save(); Toast.show('Saldo resetado para R$ 10.000,00', 'info'); }
};

// ===== TOAST =====
const Toast = {
    show(msg, type = 'info') {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = msg;
        container.appendChild(toast);
        setTimeout(() => { toast.classList.add('fadeout'); setTimeout(() => toast.remove(), 300); }, 3000);
    }
};

// ===== WEB AUDIO =====
const Sound = {
    ctx: null,
    init() { if (!this.ctx) { try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch(e) {} } },
    play(freq, duration = 0.1, type = 'sine', volume = 0.1) {
        if (!this.ctx) return;
        try {
            const osc = this.ctx.createOscillator(); const gain = this.ctx.createGain();
            osc.type = type; osc.frequency.value = freq;
            gain.gain.setValueAtTime(volume, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            osc.connect(gain); gain.connect(this.ctx.destination); osc.start(); osc.stop(this.ctx.currentTime + duration);
        } catch(e) {}
    },
    win() { this.play(523, 0.1, 'square', 0.08); setTimeout(() => this.play(659, 0.1, 'square', 0.08), 100); setTimeout(() => this.play(784, 0.15, 'square', 0.08), 200); },
    lose() { this.play(200, 0.2, 'sawtooth', 0.06); setTimeout(() => this.play(150, 0.3, 'sawtooth', 0.06), 150); },
    click() { this.play(800, 0.05, 'triangle', 0.05); },
    tick() { this.play(1200, 0.03, 'sine', 0.03); },
    whistle() { this.play(800, 0.15, 'sine', 0.1); setTimeout(() => this.play(600, 0.2, 'sine', 0.08), 150); }
};

// ===== CONFETE =====
const Confetti = {
    canvas: null, ctx: null, particles: [], animId: null,
    init() {
        this.canvas = document.getElementById('confetti-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = window.innerWidth; this.canvas.height = window.innerHeight; this.particles = [];
    },
    burst() {
        this.init();
        const colors = ['#d4af37', '#9d4edd', '#ff006e', '#00e676', '#ffffff'];
        for (let i = 0; i < 150; i++) {
            this.particles.push({
                x: window.innerWidth / 2, y: window.innerHeight / 2,
                vx: (Math.random() - 0.5) * 15, vy: (Math.random() - 1) * 15,
                size: Math.random() * 8 + 4, color: colors[Math.floor(Math.random() * colors.length)],
                rotation: Math.random() * 360, rotSpeed: (Math.random() - 0.5) * 10, gravity: 0.3
            });
        }
        this.canvas.classList.remove('hidden'); this.animate();
    },
    animate() {
        if (!this.ctx) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i]; p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.rotation += p.rotSpeed;
            this.ctx.save(); this.ctx.translate(p.x, p.y); this.ctx.rotate((p.rotation * Math.PI) / 180);
            this.ctx.fillStyle = p.color; this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); this.ctx.restore();
            if (p.y > this.canvas.height + 20) this.particles.splice(i, 1);
        }
        if (this.particles.length > 0) { this.animId = requestAnimationFrame(() => this.animate()); }
        else { this.canvas.classList.add('hidden'); if (this.animId) cancelAnimationFrame(this.animId); }
    }
};

// ===== NAVEGAÇÃO SPA =====
const Router = {
    showCatalog() {
        document.getElementById('catalog').classList.add('active');
        document.getElementById('game-area').classList.remove('active');
        document.getElementById('game-area').innerHTML = '';
        document.getElementById('btn-home').classList.add('hidden');
        State.currentGame = null;
    },
    openGame(gameName) {
        State.currentGame = gameName;
        document.getElementById('catalog').classList.remove('active');
        const area = document.getElementById('game-area'); area.classList.add('active');
        document.getElementById('btn-home').classList.remove('hidden');
        switch (gameName) {
            case 'blackjack': Blackjack.init(area); break;
            case 'crash': Crash.init(area); break;
            case 'mines': Mines.init(area); break;
        }
    }
};

// ===== PAINEL DE APOSTA REUTILIZÁVEL =====
function createBetPanel(btnText = 'Apostar') {
    const panel = document.createElement('div');
    panel.className = 'bet-panel';
    panel.innerHTML = `
        <div class="bet-panel-title">💰 Faça sua aposta</div>
        <div class="bet-row">
            <span class="bet-label">Valor:</span>
            <input type="number" class="bet-input" id="bet-amount" value="50" min="1" aria-label="Valor da aposta">
            <button class="btn-quick" data-multi="min">Min R$10</button>
            <button class="btn-quick" data-multi="0.5">½</button>
            <button class="btn-quick" data-multi="2">2x</button>
            <button class="btn-quick" data-multi="max">Max</button>
        </div>
        <div class="bet-row">
            <button class="btn" id="bet-spin" style="width:100%;font-size:1.1rem;padding:14px">${btnText}</button>
        </div>`;
    return panel;
}

function getBetAmount() { return parseFloat(document.getElementById('bet-amount').value) || 0; }

function setupBetControls(callback) {
    const input = document.getElementById('bet-amount');
    document.querySelectorAll('.btn-quick').forEach(btn => {
        btn.addEventListener('click', () => {
            const multi = btn.dataset.multi; let val = parseFloat(input.value) || 0;
            if (multi === '0.5') val = Math.floor(val / 2);
            else if (multi === '2') val = val * 2;
            else if (multi === 'max') val = State.balance;
            else if (multi === 'min') val = 10;
            val = Math.max(1, val); if (val > State.balance) val = State.balance;
            input.value = val; Sound.click();
        });
    });
    const spinBtn = document.getElementById('bet-spin');
    if (spinBtn) spinBtn.addEventListener('click', callback);
}

// =============================================
// JOGO 2: BLACKJACK
// =============================================
const Blackjack = {
    deck: [], playerHand: [], dealerHand: [], bet: 0, gameOver: false,
    init(container) {
        this.playerHand = []; this.dealerHand = []; this.gameOver = false;
        container.innerHTML = `
            <h2 class="hero-title" style="font-size:1.8rem">🃏 Blackjack</h2>
            <div class="bj-section-label">Dealer</div><div class="bj-score" id="dealer-score">-</div><div class="bj-cards" id="dealer-cards"></div>
            <div class="bj-section-label">Você</div><div class="bj-score" id="player-score">-</div><div class="bj-cards" id="player-cards"></div>
            <div class="bj-actions" id="bj-actions"><p style="color:var(--text-muted)">Defina a aposta e clique "Iniciar mão"</p></div>`;
        const bp = createBetPanel('🃏 Iniciar mão'); container.appendChild(bp);
        setupBetControls(() => this.start());
    },
    createDeck() { const s = ['♠','♥','♦','♣'], v = ['A','2','3','4','5','6','7','8','9','10','J','Q','K']; this.deck = []; for (const su of s) for (const va of v) this.deck.push({ suit: su, value: va }); for (let i = this.deck.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [this.deck[i], this.deck[j]] = [this.deck[j], this.deck[i]]; } },
    draw() { return this.deck.pop(); },
    cardValue(c) { if (c.value === 'A') return 11; if (['J','Q','K'].includes(c.value)) return 10; return parseInt(c.value); },
    handScore(h) { let s = 0, a = 0; for (const c of h) { s += this.cardValue(c); if (c.value === 'A') a++; } while (s > 21 && a > 0) { s -= 10; a--; } return s; },
    isBJ(h) { return h.length === 2 && this.handScore(h) === 21; },
    renderCard(c, hid = false) { const d = document.createElement('div'); if (hid) { d.className = 'playing-card back'; d.textContent = '?'; } else { const r = c.suit === '♥' || c.suit === '♦'; d.className = `playing-card ${r ? 'red' : 'black'}`; d.innerHTML = `${c.value}<br>${c.suit}`; } return d; },
    render() { const p = document.getElementById('player-cards'), d = document.getElementById('dealer-cards'); p.innerHTML = ''; d.innerHTML = ''; this.playerHand.forEach(c => p.appendChild(this.renderCard(c))); this.dealerHand.forEach((c, i) => { if (this.gameOver || i === 0) d.appendChild(this.renderCard(c)); else d.appendChild(this.renderCard(c, true)); }); document.getElementById('player-score').textContent = this.playerHand.length > 0 ? this.handScore(this.playerHand) : '-'; document.getElementById('dealer-score').textContent = this.gameOver ? this.handScore(this.dealerHand) : (this.dealerHand.length > 0 ? '?' : '-'); },
    updateActions(acts) { const el = document.getElementById('bj-actions'); el.innerHTML = ''; acts.forEach(a => { const b = document.createElement('button'); b.className = `btn ${a.class || ''}`; b.textContent = a.label; b.addEventListener('click', a.fn); el.appendChild(b); }); },
    start() { const bet = getBetAmount(); if (!State.canBet(bet)) { Toast.show('Saldo insuficiente', 'loss'); return; } State.debit(bet); this.bet = bet; this.createDeck(); this.playerHand = [this.draw(), this.draw()]; this.dealerHand = [this.draw(), this.draw()]; this.gameOver = false; this.render(); Sound.click();
        if (this.isBJ(this.playerHand)) { this.gameOver = true; this.render(); if (this.isBJ(this.dealerHand)) { State.credit(this.bet); Toast.show('Push! Aposta devolvida.', 'info'); } else { const p = Math.floor(this.bet * 2.5); State.credit(p); Toast.show(`🎉 Blackjack! Ganhou ${State.formatCurrency(p - this.bet)}!`, 'win'); Sound.win(); Confetti.burst(); } this.updateActions([{ label: 'Nova mão', fn: () => this.start() }]); return; }
        this.updateActions([{ label: 'Hit', fn: () => this.hit() }, { label: 'Stand', fn: () => this.stand() }, { label: 'Double', fn: () => this.double(), class: 'btn-secondary' }]);
    },
    hit() { this.playerHand.push(this.draw()); this.render(); Sound.click(); const s = this.handScore(this.playerHand); if (s > 21) { this.gameOver = true; this.render(); Toast.show('Bust! Estourou', 'loss'); Sound.lose(); this.updateActions([{ label: 'Nova mão', fn: () => this.start() }]); } else if (s === 21) this.stand(); },
    stand() { this.gameOver = true; Sound.click(); const dt = () => { const ds = this.handScore(this.dealerHand); if (ds < 17) { this.dealerHand.push(this.draw()); this.render(); Sound.tick(); setTimeout(dt, 700); } else this.finish(); }; dt(); },
    double() { if (!State.canBet(this.bet)) { Toast.show('Saldo insuficiente', 'warning'); return; } State.debit(this.bet); this.bet *= 2; this.playerHand.push(this.draw()); this.render(); if (this.handScore(this.playerHand) > 21) { this.gameOver = true; this.render(); Toast.show('Bust!', 'loss'); Sound.lose(); this.updateActions([{ label: 'Nova mão', fn: () => this.start() }]); } else this.stand(); },
    finish() { const p = this.handScore(this.playerHand), d = this.handScore(this.dealerHand); this.render(); if (d > 21 || p > d) { State.credit(this.bet * 2); Toast.show(`🎉 Ganhou ${State.formatCurrency(this.bet)}!`, 'win'); Sound.win(); } else if (p === d) { State.credit(this.bet); Toast.show('Push! Empate.', 'info'); } else { Toast.show(`Perdeu ${State.formatCurrency(this.bet)}`, 'loss'); Sound.lose(); } this.updateActions([{ label: 'Nova mão', fn: () => this.start() }]); }
};

// =============================================
// JOGO 4: CRASH
// =============================================
const Crash = {
    canvas: null, ctx: null, multiplier: 1.0, crashPoint: 0, cashedOut: false, running: false, animId: null, history: [], startTime: 0, bet: 0,
    init(container) { this.multiplier = 1.0; this.cashedOut = false; this.running = false; if (this.animId) { cancelAnimationFrame(this.animId); this.animId = null; } container.innerHTML = `<h2 class="hero-title" style="font-size:1.8rem">🚀 Crash</h2><div class="crash-multiplier" id="crash-mult">1.00x</div><canvas id="crash-canvas" width="600" height="280"></canvas><div class="crash-history" id="crash-history"></div><button class="btn btn-green" id="crash-cashout" style="font-size:1.1rem;padding:14px;width:100%">💰 Cash Out!</button>`; const bp = createBetPanel('🚀 Iniciar'); container.appendChild(bp); this.canvas = document.getElementById('crash-canvas'); this.ctx = this.canvas.getContext('2d'); this.renderHistory(); this.drawChart(1, false, 0); document.getElementById('crash-cashout').addEventListener('click', () => this.cashOut()); setupBetControls(() => this.start()); },
    gcp() { const r = Math.random(); if (r < 0.03) return 1.0; return Math.max(1.0, (1 / (1 - r)) * 0.97); },
    start() { if (this.running) return; const bet = getBetAmount(); if (!State.canBet(bet)) { Toast.show('Saldo insuficiente', 'loss'); return; } State.debit(bet); this.bet = bet; this.multiplier = 1.0; this.cashedOut = false; this.running = true; this.crashPoint = this.gcp(); this.startTime = performance.now(); Sound.click(); document.getElementById('crash-cashout').classList.add('show'); document.getElementById('crash-mult').textContent = '1.00x'; document.getElementById('crash-mult').style.color = 'var(--primary)'; this.animate(); },
    animate() { if (!this.running) return; const el = (performance.now() - this.startTime) / 1000; this.multiplier = 1.0 + 0.06 * Math.pow(el, 1.8); document.getElementById('crash-mult').textContent = this.multiplier.toFixed(2) + 'x'; const cr = this.multiplier >= this.crashPoint; this.drawChart(this.multiplier, cr, el); if (cr) { this.running = false; document.getElementById('crash-mult').style.color = 'var(--red)'; document.getElementById('crash-mult').textContent = '💥 ' + this.crashPoint.toFixed(2) + 'x'; document.getElementById('crash-cashout').classList.remove('show'); this.history.unshift({ point: this.crashPoint, win: this.cashedOut }); if (this.history.length > 10) this.history.pop(); this.renderHistory(); if (!this.cashedOut) { Toast.show(`💥 Crash em ${this.crashPoint.toFixed(2)}x! Perdeu ${State.formatCurrency(this.bet)}`, 'loss'); Sound.lose(); } } else { this.animId = requestAnimationFrame(() => this.animate()); } },
    cashOut() { if (!this.running || this.cashedOut) return; this.cashedOut = true; const p = Math.floor(this.bet * this.multiplier); State.credit(p); Toast.show(`🎉 Cash out em ${this.multiplier.toFixed(2)}x! Ganhou ${State.formatCurrency(p - this.bet)}!`, 'win'); Sound.win(); document.getElementById('crash-cashout').classList.remove('show'); if (this.multiplier >= 5) Confetti.burst(); },
    drawChart(m, cr, el) { const ctx = this.ctx, w = this.canvas.width, h = this.canvas.height; ctx.clearRect(0, 0, w, h); ctx.strokeStyle = 'rgba(157,78,221,0.1)'; ctx.lineWidth = 1; for (let x = 0; x <= w; x += 60) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); } for (let y = 0; y <= h; y += 50) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); } const pts = []; for (let t = 0; t <= el; t += 0.05) { const mm = 1.0 + 0.06 * Math.pow(t, 1.8); if (mm > m) break; const x = 50 + (t / Math.max(el, 5)) * (w - 80); const y = h - 30 - Math.min(mm - 1, 8) * 25; pts.push({ x, y }); } if (pts.length > 1) { ctx.strokeStyle = cr ? '#ff1744' : '#00e676'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y); ctx.stroke(); const l = pts[pts.length - 1]; ctx.font = '20px sans-serif'; ctx.fillText(cr ? '💥' : '🚀', l.x - 10, l.y - 5); } },
    renderHistory() { const el = document.getElementById('crash-history'); if (!el) return; el.innerHTML = ''; this.history.forEach(h => { const i = document.createElement('span'); i.className = `crash-history-item ${h.win ? 'win' : 'loss'}`; i.textContent = h.point.toFixed(2) + 'x'; el.appendChild(i); }); }
};

// =============================================
// JOGO 6: MINES
// =============================================
const Mines = {
    grid: [], mineCount: 3, revealed: 0, safeCount: 0, multiplier: 1, started: false, bet: 0,
    init(container) { this.grid = []; this.revealed = 0; this.multiplier = 1; this.started = false; container.innerHTML = `<h2 class="hero-title" style="font-size:1.8rem">💎 Mines</h2><div class="mines-info"><div><label style="color:var(--text-muted);font-size:0.9rem">Minas: </label><select id="mines-count" style="background:var(--bg-base);color:var(--primary);border:1px solid var(--secondary);border-radius:6px;padding:5px 10px;font-size:1rem">${Array.from({ length: 24 }, (_, i) => `<option value="${i + 1}" ${i + 1 === 3 ? 'selected' : ''}>${i + 1}</option>`).join('')}</select></div><span class="mines-multiplier" id="mines-mult">1.00x</span><button class="btn btn-green" id="mines-cashout" style="display:none">💰 Cash Out</button></div><div class="mines-grid" id="mines-grid"></div>`; const bp = createBetPanel('💎 Iniciar Jogo'); container.appendChild(bp); setupBetControls(() => this.start()); document.getElementById('mines-cashout').addEventListener('click', () => this.cashOut()); this.renderGrid(); },
    start() { const bet = getBetAmount(); if (!State.canBet(bet)) { Toast.show('Saldo insuficiente', 'loss'); return; } State.debit(bet); this.bet = bet; this.mineCount = parseInt(document.getElementById('mines-count').value); this.safeCount = 25 - this.mineCount; this.revealed = 0; this.multiplier = 1; this.started = true; const ms = new Set(); while (ms.size < this.mineCount) ms.add(Math.floor(Math.random() * 25)); this.grid = Array.from({ length: 25 }, (_, i) => ms.has(i) ? 'bomb' : 'diamond'); this.renderGrid(); document.getElementById('mines-mult').textContent = '1.00x'; document.getElementById('mines-cashout').style.display = 'inline-block'; Sound.click(); },
    renderGrid() { const g = document.getElementById('mines-grid'); g.innerHTML = ''; for (let i = 0; i < 25; i++) { const c = document.createElement('div'); c.className = 'mine-cell'; c.dataset.index = i; c.addEventListener('click', () => this.reveal(i)); g.appendChild(c); } },
    reveal(idx) { if (!this.started) return; const c = document.querySelector(`.mine-cell[data-index="${idx}"]`); if (c.classList.contains('revealed')) return; const ct = this.grid[idx]; c.classList.add('revealed'); if (ct === 'bomb') { c.classList.add('bomb'); c.textContent = '💣'; this.started = false; this.grid.forEach((x, i) => { const e = document.querySelector(`.mine-cell[data-index="${i}"]`); if (!e.classList.contains('revealed')) { e.classList.add('revealed'); e.textContent = x === 'bomb' ? '💣' : '💎'; if (x === 'diamond') e.classList.add('diamond'); else e.classList.add('bomb'); } }); document.getElementById('mines-cashout').style.display = 'none'; Toast.show(`💣 Boom! Perdeu ${State.formatCurrency(this.bet)}`, 'loss'); Sound.lose(); } else { c.classList.add('diamond'); c.textContent = '💎'; this.revealed++; Sound.tick(); const sr = this.safeCount - this.revealed; if (sr > 0) this.multiplier = (25 - this.mineCount) / (25 - this.mineCount - this.revealed); else this.multiplier = 999; document.getElementById('mines-mult').textContent = this.multiplier.toFixed(2) + 'x'; if (this.revealed === this.safeCount) this.cashOut(); } },
    cashOut() { if (!this.started) return; this.started = false; const p = Math.floor(this.bet * this.multiplier); State.credit(p); document.getElementById('mines-cashout').style.display = 'none'; this.grid.forEach((x, i) => { const e = document.querySelector(`.mine-cell[data-index="${i}"]`); if (!e.classList.contains('revealed')) { e.classList.add('revealed'); e.textContent = x === 'bomb' ? '💣' : '💎'; if (x === 'diamond') e.classList.add('diamond'); else e.classList.add('bomb'); } }); Toast.show(`🎉 Cash out em ${this.multiplier.toFixed(2)}x! Ganhou ${State.formatCurrency(p - this.bet)}!`, 'win'); Sound.win(); if (this.multiplier >= 5) Confetti.burst(); }
};

// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    State.init();
    document.querySelectorAll('.game-card').forEach(card => {
        card.addEventListener('click', () => { Sound.init(); Sound.click(); Router.openGame(card.dataset.game); });
    });
    document.getElementById('btn-reset').addEventListener('click', () => { Sound.click(); State.reset(); });
    document.getElementById('btn-home').addEventListener('click', () => { Sound.click(); if (Crash.animId) { cancelAnimationFrame(Crash.animId); Crash.animId = null; } Crash.running = false; Router.showCatalog(); });
    window.addEventListener('resize', () => { if (Confetti.canvas) { Confetti.canvas.width = window.innerWidth; Confetti.canvas.height = window.innerHeight; } });
});