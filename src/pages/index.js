import React from 'react';
import Head from 'next/head';
import Link from 'next/link';

export default function MainMenu() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-12 px-6 text-white" 
         style={{ background: 'linear-gradient(180deg, #4b1414 0%, #000000 40%, #000000 100%)', backgroundAttachment: 'fixed' }}>
      
      <Head>
        <title>FENIX GROUP | SUITE AZIENDALE</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </Head>

      <header className="w-full flex flex-col items-center mb-16 animate-in fade-in slide-in-from-top-10 duration-700">
        <img src="/logo.png" alt="Logo Fenix Group" className="h-[180px] w-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.8)] mb-6" />
        <div className="bg-black/80 backdrop-blur-xl p-4 rounded-2xl border border-red-500/30 shadow-2xl text-center">
          <span className="font-bold uppercase tracking-[0.3em] block px-6 text-xs md:text-sm text-red-500">
            Seleziona un Programma
          </span>
        </div>
      </header>

      <main className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch animate-in fade-in zoom-in-95 duration-700 delay-150">
        
        {/* BOTTONE PROGRAMMA RPO */}
        <Link href="/rpo" className="group">
          <div className="bg-black/40 backdrop-blur-md p-10 rounded-[35px] border border-white/10 flex flex-col items-center text-center h-full cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:bg-black/60 hover:border-red-500 hover:shadow-[0_0_50px_rgba(239,68,68,0.3)]">
            <div className="w-20 h-20 rounded-2xl bg-red-500/20 flex items-center justify-center mb-6 group-hover:bg-red-500 transition-colors duration-500">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-widest mb-4">Programma RPO</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Suite completa per l'estrazione, il taglio e la bonifica dei numeri di telefono con il portale del Registro Pubblico delle Opposizioni.
            </p>
          </div>
        </Link>

        {/* BOTTONE FOTO PLANIMETRIE */}
        <Link href="/planimetrie" className="group">
          <div className="bg-black/40 backdrop-blur-md p-10 rounded-[35px] border border-white/10 flex flex-col items-center text-center h-full cursor-pointer transition-all duration-500 hover:scale-[1.02] hover:bg-black/60 hover:border-red-500 hover:shadow-[0_0_50px_rgba(239,68,68,0.3)]">
            <div className="w-20 h-20 rounded-2xl bg-red-500/20 flex items-center justify-center mb-6 group-hover:bg-red-500 transition-colors duration-500">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
            </div>
            <h2 className="text-3xl font-black uppercase tracking-widest mb-4">Foto Planimetrie</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              Nuovo tool per la gestione, l'ottimizzazione e l'elaborazione delle planimetrie immobiliari e dei contenuti fotografici.
            </p>
          </div>
        </Link>

      </main>

      <footer className="mt-24 opacity-20 text-[8px] tracking-[0.8em] uppercase font-bold text-center absolute bottom-8">
        REALINDI®DEN SYSTEM © 2026
      </footer>
    </div>
  );
}
