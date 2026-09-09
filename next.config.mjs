/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // Lint separately; don't fail production builds on style-level lint rules.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
