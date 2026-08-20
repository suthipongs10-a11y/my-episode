import type { NextConfig } from "next";

/**
 * ตอน dev Next จะบล็อกการโหลด /_next/* จาก origin อื่นที่ไม่ใช่ localhost
 * ซึ่งทำให้เปิดจากมือถือในวงเดียวกัน (เช่น http://192.168.1.20:3000) แล้วหน้าเว็บไม่ทำงาน
 * ใส่ IP เครื่องไว้ใน DEV_ORIGINS (คั่นด้วยจุลภาค) เวลาจะลองบนมือถือ
 */
const devOrigins = (process.env.DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  allowedDevOrigins: ["localhost", "127.0.0.1", ...devOrigins],
};

export default nextConfig;
