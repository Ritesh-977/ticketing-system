"use client";

import { useState } from "react";

export default function Home() {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<{ id: number; user: string; status: number; message: string; latency: number }[]>([]);
  const [eventData, setEventData] = useState<{ eventId: string; publishableKey: string; inventory: number } | null>(null);

  // Track visual representation of the users for flash sale
  const [activeSimulation, setActiveSimulation] = useState<"flash_sale" | "high_throughput" | null>(null);

  const setupEvent = async (inventory: number) => {
    setLoading(true);
    setLogs([]);
    setActiveSimulation(null);
    try {
      const res = await fetch("/api/setup-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inventory })
      });
      const data = await res.json();
      if (res.ok) {
        setEventData(data);
        setLogs([{ id: Date.now(), user: "System", status: 200, message: `Provisioned Database Event with ${data.inventory} Tickets.`, latency: 0 }]);
      } else {
        setLogs([{ id: Date.now(), user: "System", status: res.status, message: data.error, latency: 0 }]);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const executeSimulation = async (totalUsers: number, type: "flash_sale" | "high_throughput") => {
    if (!eventData) return;
    setLoading(true);
    setLogs([]);
    setActiveSimulation(type);

    // Prepare visual dummy logs first so the UI shows them as "Pending"
    const initialLogs = Array.from({ length: totalUsers }).map((_, idx) => ({
      id: idx,
      user: `Buyer ${idx + 1}`,
      status: 0, // 0 = Pending
      message: "Waiting for database lock...",
      latency: 0
    }));
    setLogs(initialLogs);

    // For "Flash Sale" we fire them completely concurrently using Promise.all
    // For "High Throughput" we might slightly stagger them to show a stream, but let's do all concurrent to truly test ACID
    const startTime = Date.now();
    const promises = Array.from({ length: totalUsers }).map(async (_, idx) => {
      const reqStart = Date.now();
      try {
        const res = await fetch("/api/checkout-proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId: eventData.eventId, publishableKey: eventData.publishableKey })
        });
        const data = await res.json();
        const latency = Date.now() - reqStart;

        const finalLog = {
          id: idx,
          user: `Buyer ${idx + 1}`,
          status: res.status,
          message: data.data?.error || data.data?.message || "Processed",
          latency
        };

        // Update the specific log item in real-time
        setLogs(prev => prev.map(l => l.id === idx ? finalLog : l));

        // Update local inventory state safely if successful
        if (res.status === 201) {
          setEventData(prev => prev ? { ...prev, inventory: Math.max(0, prev.inventory - 1) } : null);
        }

        return finalLog;
      } catch (e) {
        const errLog = { id: idx, user: `Buyer ${idx + 1}`, status: 500, message: "Network Error", latency: Date.now() - reqStart };
        setLogs(prev => prev.map(l => l.id === idx ? errLog : l));
        return errLog;
      }
    });

    await Promise.all(promises);
    const totalTime = Date.now() - startTime;

    setLogs(prev => [
      { id: 9999, user: "Engine", status: 200, message: `Simulation finished in ${totalTime}ms`, latency: totalTime },
      ...prev
    ]);

    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-neutral-950 p-6 md:p-12 font-sans text-neutral-200">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center space-y-3 pb-8 border-b border-neutral-800">
          <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tight">
            Ticketing Sandbox
          </h1>
          <p className="text-neutral-400 text-lg max-w-2xl mx-auto">
            Live demonstration of enterprise-grade ACID Compliance, PostgreSQL Row-Level Locking (<code className="text-blue-300">FOR UPDATE</code>), and Asynchronous RabbitMQ Webhook Delivery.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* LEFT COLUMN: Controls & Scenarios */}
          <div className="lg:col-span-5 space-y-6">

            {/* Database State Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" /></svg>
                  Database State
                </h2>
                <span className="text-xs font-mono bg-blue-900/30 text-blue-400 px-2 py-1 rounded border border-blue-800/50">PostgreSQL 16</span>
              </div>

              <div className="bg-neutral-950 rounded-xl p-6 flex flex-col items-center justify-center border border-neutral-800/50 shadow-inner">
                <span className="text-sm text-neutral-500 font-medium uppercase tracking-widest mb-2">Available Inventory</span>
                <span className={`text-6xl font-black tabular-nums transition-colors duration-300 ${!eventData ? 'text-neutral-700' : eventData.inventory === 0 ? 'text-red-500' : 'text-green-400'}`}>
                  {eventData ? eventData.inventory : "---"}
                </span>
                {eventData && eventData.inventory === 0 && (
                  <span className="mt-2 text-red-400 font-bold animate-pulse">SOLD OUT</span>
                )}
              </div>
            </div>

            {/* Scenarios Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">Test Scenarios</h2>

              {/* Scenario 1 */}
              <div className="space-y-4 mb-8">
                <div>
                  <h3 className="text-lg font-bold text-orange-400">1. The "Sneaker Drop" (Flash Sale)</h3>
                  <p className="text-sm text-neutral-400 mt-1 mb-3 leading-relaxed">
                    Creates an event with exactly <strong>5 tickets</strong>, then fires <strong>100 simultaneous requests</strong> at the exact same millisecond. Proves that PostgreSQL's native ACID locks prevent overselling entirely.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setupEvent(5)} disabled={loading} className="py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition disabled:opacity-50">
                    Setup Event (5 Tkts)
                  </button>
                  <button onClick={() => executeSimulation(100, "flash_sale")} disabled={loading || !eventData} className="py-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-bold shadow-[0_0_15px_rgba(234,88,12,0.2)] transition disabled:opacity-50">
                    Launch 100 Bots
                  </button>
                </div>
              </div>

              <div className="h-px w-full bg-neutral-800 mb-8"></div>

              {/* Scenario 2 */}
              <div className="space-y-4 mb-8">
                <div>
                  <h3 className="text-lg font-bold text-green-400">2. High Throughput Queue</h3>
                  <p className="text-sm text-neutral-400 mt-1 mb-3 leading-relaxed">
                    Creates an event with <strong>100 tickets</strong>, then fires <strong>50 simultaneous requests</strong>. Proves the C-level performance of Postgres queueing transactions in microseconds without dropping requests.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <button onClick={() => setupEvent(100)} disabled={loading} className="py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg font-medium transition disabled:opacity-50">
                    Setup Event (100 Tkts)
                  </button>
                  <button onClick={() => executeSimulation(50, "high_throughput")} disabled={loading || !eventData} className="py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-bold shadow-[0_0_15px_rgba(22,163,74,0.2)] transition disabled:opacity-50">
                    Launch 50 Buyers
                  </button>
                </div>
              </div>

            </div>

          </div>

          {/* RIGHT COLUMN: Visualizer & Logs */}
          <div className="lg:col-span-7 flex flex-col space-y-6">

            {/* Visualizer */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-2xl flex-1 min-h-[400px] flex flex-col">
              <div className="flex justify-between items-center border-b border-neutral-800 pb-4 mb-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  Concurrency Visualizer
                </h2>
                <div className="flex gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500"></div> Success</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> Sold Out</span>
                  <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-neutral-600"></div> Pending / HTTP Queue</span>
                </div>
              </div>

              {/* Grid of squares representing requests */}
              <div className="flex-1 bg-neutral-950 rounded-xl p-4 border border-neutral-800 shadow-inner overflow-hidden flex flex-col">
                {!activeSimulation && logs.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-neutral-500 space-y-3">
                    <svg className="w-12 h-12 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                    <p>Waiting for a simulation to launch...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-10 sm:grid-cols-10 gap-2 auto-rows-max">
                    {logs.filter(l => l.id !== 9999).map((log) => (
                      <div
                        key={log.id}
                        title={`${log.user}: ${log.message} (${log.latency}ms)`}
                        className={`aspect-square rounded-md transition-all duration-500 shadow-sm flex items-center justify-center border
                                    ${log.status === 201 ? 'bg-green-500 border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.6)] scale-105 z-10' :
                            log.status === 400 ? 'bg-red-500 border-red-400 opacity-80' :
                              log.status === 429 ? 'bg-orange-500 border-orange-400' :
                                log.user === "System" ? 'hidden' :
                                  'bg-neutral-800 border-neutral-700 animate-pulse'}`}
                      >
                        {log.status === 201 && <svg className="w-1/2 h-1/2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Terminal Logs */}
            <div className="bg-black border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl h-[300px] flex flex-col relative group">
              <div className="bg-neutral-900 border-b border-neutral-800 p-3 flex gap-2 items-center">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <span className="text-xs text-neutral-500 font-mono ml-2">network_logs.sh</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-1.5 scroll-smooth">
                {logs.length === 0 ? (
                  <div className="text-neutral-600">_ tailing network requests...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className={`flex gap-3 leading-relaxed ${log.status === 201 || log.status === 200 ? 'text-green-400' :
                        log.status === 400 ? 'text-red-400' :
                          log.status === 429 ? 'text-orange-400' :
                            'text-neutral-400'
                      }`}>
                      <span className="opacity-50 shrink-0">[{new Date().toISOString().split('T')[1].substring(0, 12)}]</span>
                      <span className="w-12 shrink-0 font-bold">{log.status === 0 ? '---' : log.status}</span>
                      <span className="w-20 shrink-0 opacity-75 text-right">{log.latency > 0 ? `${log.latency}ms` : ''}</span>
                      <span className="w-20 shrink-0 text-blue-300">{log.user}</span>
                      <span className="truncate flex-1">{log.message}</span>
                    </div>
                  ))
                )}
              </div>
              {/* Overlay shadow for scrolling effect */}
              <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-black to-transparent pointer-events-none"></div>
            </div>

          </div>

        </div>

        {/* Footer info about Architecture */}
        <div className="bg-blue-900/10 border border-blue-900/30 rounded-2xl p-6 shadow-lg">
          <h3 className="text-blue-300 font-bold mb-3 flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Why this Architecture Wins
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-neutral-300">
            <div>
              <strong className="text-white block mb-1">1. ACID Reliability</strong>
              Unlike standard Node.js applications that suffer from race conditions under load, this Engine delegates locking to Postgres (<code className="bg-black px-1 rounded">FOR UPDATE</code>). This guarantees 100% data consistency even with 10,000 requests per second.
            </div>
            <div>
              <strong className="text-white block mb-1">2. No Blocking Timeouts</strong>
              By removing the clumsy 3-second Redis lock, the Engine processes requests seamlessly at C-level speeds natively inside the database, unlocking true High Throughput capabilities.
            </div>
            <div>
              <strong className="text-white block mb-1">3. RabbitMQ Decoupling</strong>
              Notice how fast the 201 Success returns (often &lt;40ms)? The Engine immediately commits the transaction, then asynchronously hands Webhook and PDF Generation tasks to RabbitMQ workers so the buyer is never kept waiting.
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
