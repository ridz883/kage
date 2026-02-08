const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// --- KONFIGURASI TARGET ---
const TARGET_URL = 'https://www.google.com'; 
const PORT = process.env.PORT || 3000;

// Dashboard HTML terintegrasi
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WebGuard Dashboard</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        body { background: #0f172a; color: white; font-family: sans-serif; }
        .card { background: #1e293b; border: 1px solid #334155; border-radius: 1rem; padding: 1.5rem; }
    </style>
</head>
<body class="p-5 md:p-10">
    <div class="max-w-5xl mx-auto">
        <div class="flex justify-between items-center mb-10 border-b border-slate-700 pb-5">
            <h1 class="text-2xl font-bold text-blue-500">🛡️ WEB-SHIELD MONITOR</h1>
            <div class="text-right">
                <p class="text-xs text-slate-400 uppercase tracking-widest">Target Website</p>
                <p class="text-sm font-mono text-blue-300 font-bold">${TARGET_URL}</p>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="card">
                <p class="text-slate-400 text-sm mb-1">Status Utama</p>
                <h2 id="status" class="text-3xl font-black text-slate-500 italic uppercase tracking-tighter">Wait...</h2>
            </div>
            <div class="card border-l-4 border-l-blue-500">
                <p class="text-slate-400 text-sm mb-1">Response Time</p>
                <h2 id="latency" class="text-3xl font-black text-blue-400 font-mono">0 ms</h2>
            </div>
            <div class="card border-l-4 border-l-green-500">
                <p class="text-slate-400 text-sm mb-1">Security Score</p>
                <h2 id="threat" class="text-3xl font-black text-green-500">A+ SAFE</h2>
            </div>
        </div>

        <div class="card mb-8">
            <h3 class="text-slate-400 text-xs font-bold mb-4 uppercase tracking-widest">Real-Time Performance Chart</h3>
            <canvas id="monitorChart" height="120"></canvas>
        </div>

        <div class="bg-black/50 p-5 rounded-xl border border-red-900/20">
            <h3 class="text-red-500 text-xs font-bold mb-3 uppercase tracking-widest">Security Activity Logs</h3>
            <div id="logs" class="text-[10px] font-mono space-y-2 opacity-80 h-32 overflow-y-auto"></div>
        </div>
    </div>

    <script>
        const socket = io();
        const ctx = document.getElementById('monitorChart').getContext('2d');
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Latency (ms)',
                    data: [],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0
                }]
            },
            options: {
                plugins: { legend: { display: false } },
                scales: { 
                    y: { grid: { color: '#334155' }, ticks: { color: '#94a3b8' } },
                    x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
                }
            }
        });

        socket.on('update', (data) => {
            const statusEl = document.getElementById('status');
            statusEl.innerText = data.status;
            statusEl.className = \`text-3xl font-black italic uppercase \${data.status === 'ONLINE' ? 'text-green-400' : 'text-red-500'}\`;
            
            document.getElementById('latency').innerText = data.latency + ' ms';
            
            if (chart.data.labels.length > 20) {
                chart.data.labels.shift();
                chart.data.datasets[0].data.shift();
            }
            chart.data.labels.push(data.time);
            chart.data.datasets[0].data.push(data.latency);
            chart.update();

            // Skenario Alert Keamanan
            if (data.latency > 1500) {
                const logs = document.getElementById('logs');
                logs.innerHTML = \`<p class="text-yellow-500">[\${data.time}] WARNING: High Latency detected (\${data.latency}ms). Possible network instability.</p>\` + logs.innerHTML;
                document.getElementById('threat').innerText = "CAUTION";
                document.getElementById('threat').className = "text-3xl font-black text-yellow-500";
            }
        });
    </script>
</body>
</html>
    `);
});

// LOGIKA MONITORING (Setiap 10 detik)
setInterval(async () => {
    const start = Date.now();
    try {
        await axios.get(TARGET_URL, { timeout: 8000 });
        const latency = Date.now() - start;
        io.emit('update', {
            status: 'ONLINE',
            latency: latency,
            time: new Date().toLocaleTimeString()
        });
    } catch (e) {
        io.emit('update', {
            status: 'OFFLINE',
            latency: 0,
            time: new Date().toLocaleTimeString()
        });
    }
}, 10000);

server.listen(PORT, () => console.log('Server Ready!'));
