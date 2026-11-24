/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveAlias: {
      crypto: { browser: 'crypto-browserify' },
      stream: { browser: 'stream-browserify' },
      url: { browser: 'url' },
      zlib: { browser: 'browserify-zlib' },
      http: { browser: 'stream-http' },
      https: { browser: 'https-browserify' },
      assert: { browser: 'assert' },
      os: { browser: 'os-browserify/browser' },
      path: { browser: 'path-browserify' },
      buffer: { browser: 'buffer' },
      process: { browser: 'process/browser' },
    },
  },
};

export default nextConfig;