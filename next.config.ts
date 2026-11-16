import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fotos de referencia de la landing, alojadas en el CDN de Higgsfield
    remotePatterns: [{ protocol: "https", hostname: "d8j0ntlcm91z4.cloudfront.net", pathname: "/user_2zkI0jM7sJ3yYe3PzFEgTYfZKSN/**" }],
    formats: ["image/avif", "image/webp"],
  },
};

export default nextConfig;
