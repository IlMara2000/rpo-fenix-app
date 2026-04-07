/** @type {import('next').NextConfig} */
const nextConfig = {
  // Forza Next.js a trattare sharp come dipendenza esterna.
  // Questo risolve l'errore "Module not found" durante il build su Vercel.
  serverExternalPackages: ['sharp'],
};

module.exports = nextConfig;