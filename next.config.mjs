/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // El build falla si hay errores de tipo. El type-check tambien corre en CI (GitHub Actions).
    ignoreBuildErrors: false,
  },
  // Nota: Next 16 ya no corre ESLint durante `next build`, así que la antigua
  // clave `eslint.ignoreDuringBuilds` fue removida (generaba un warning). El
  // lint sigue como gate en CI (GitHub Actions).
  images: {
    unoptimized: true,
  },
}

export default nextConfig
