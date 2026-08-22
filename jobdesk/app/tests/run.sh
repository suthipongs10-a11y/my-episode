#!/usr/bin/env bash
# รันชุดทดสอบเบราว์เซอร์ทั้งหมดกับ server ที่รันอยู่แล้ว
#
#   npm run build && npm start &      # หรือ npm run dev
#   npm run db -- reset && npm run db -- seed
#   ./tests/run.sh                    # หรือ ./tests/run.sh leads
#
# ต้องมี playwright + chromium ในเครื่อง ถ้าติดตั้งไว้คนละที่ ให้ตั้ง:
#   PLAYWRIGHT_PACKAGE=/path/to/playwright/index.js
#   CHROME_PATH=/path/to/chrome
set -euo pipefail
cd "$(dirname "$0")/.."

# ดึงรหัสผ่านจาก .env.local เหมือนที่แอปใช้ ไม่ฝังในไฟล์ทดสอบ
if [ -z "${APP_PASSWORD:-}" ] && [ -f .env.local ]; then
  APP_PASSWORD=$(grep -E '^APP_PASSWORD=' .env.local | head -1 | cut -d= -f2- | tr -d '"'"'"'')
  export APP_PASSWORD
fi
: "${APP_PASSWORD:?ตั้ง APP_PASSWORD หรือใส่ไว้ใน .env.local ก่อน}"

if [ -z "${CRON_SECRET:-}" ] && [ -f .env.local ]; then
  CRON_SECRET=$(grep -E '^CRON_SECRET=' .env.local | head -1 | cut -d= -f2- | tr -d '"'"'"'')
  export CRON_SECRET
fi
: "${CRON_SECRET:?ตั้ง CRON_SECRET หรือใส่ไว้ใน .env.local ก่อน}"
export BASE_URL="${BASE_URL:-http://localhost:3000}"

OUT="${OUT:-$(mktemp -d)}"
suites=("${@:-core leads renewals}")
[ $# -gt 0 ] && suites=("$@") || suites=(core leads renewals)

fail=0
for s in "${suites[@]}"; do
  echo "### $s"
  # ทุกชุดเริ่มจากข้อมูลตัวอย่างชุดเดิม จะได้ไม่ขึ้นกับลำดับที่รัน
  node tools/db.mjs reset >/dev/null && node tools/db.mjs seed >/dev/null
  node "tests/$s.mjs" "$OUT" || fail=1
done
echo
echo "ภาพหน้าจออยู่ที่ $OUT"
exit $fail
