/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Add remote hosts here if you end up hosting photos externally
    // (e.g. Cloudinary, an S3 bucket). Local /public/images works with no config.
    remotePatterns: [],
  },
};

export default nextConfig;
