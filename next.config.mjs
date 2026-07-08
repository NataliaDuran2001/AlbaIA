/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // El build falla si hay errores de tipo. El type-check tambien corre en CI (GitHub Actions).
    ignoreBuildErrors: false,
  },
  eslint: {
    // El lint no bloquea el build de Vercel; corre como gate en CI (GitHub Actions).
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
