/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'node:sqlite',
    'bcryptjs',
    'nodemailer',
    'googleapis',
    'formidable',
  ],
  // Tắt strict mode để tránh double-render trong dev (quan trọng với DB init)
  reactStrictMode: false,
};

export default nextConfig;
