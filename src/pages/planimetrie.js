import React from 'react';
import Head from 'next/head';

export default function PlanimetrieTool() {
  return (
    <div className="min-h-screen flex flex-col items-center py-12 px-6 text-white" 
         style={{ background: 'linear-gradient(180deg, #4b1414 0%, #000000 40%, #000000 100%)', backgroundAttachment: 'fixed' }}>
      
      <Head>
        <title>FENIX GROUP | FOTO PLANIMETRIE</title>
      </Head>

      {/* TASTO TORNA AL MENU */}
      <div className="w-full max-w-4xl flex justify-start mb-4">
        <button onClick={() => window.location.href = '/'} className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-white/50 hover:text-white transition-colors bg-black/40 px-4 py-2 rounded-xl border border-white/10">
          ← Torna al Menu
        </button>
      </div>

      <header className="w-full max-w-4xl mb-12 flex flex-col items-center">
        <img src="/logo.png" alt="Logo" className="h-[156px] w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] mb-6" />
        <div className="bg-black/80 backdrop-blur-xl p-4 rounded-2xl border border-red-500/30 shadow-2xl text-center">
          <span className="font-bold uppercase tracking-widest block px-4 text-xs md:text-sm text-red-500">
            STRUMENTO IN ARRIVO
          </span>
        </div>
      </header>

      <main className="w-full max-w-4xl flex flex-col items-center justify-center flex-1">
        <div className="bg-black/40 backdrop-blur-md p-12 rounded-[35px] border border-white/10 text-center animate-pulse">
          <h2 className="text-3xl font-black uppercase tracking-widest mb-4">Tool Planimetrie</h2>
          <p className="text-gray-400">Questo modulo è in fase di sviluppo. Torna a trovarci presto!</p>
        </div>
      </main>

      <footer className="mt-24 opacity-20 text-[8px] tracking-[0.8em] uppercase font-bold text-center">
        REALINDI®DEN SYSTEM © 2026
      </footer>
    </div>
  );
}
