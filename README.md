# All in One Investor

แพลตฟอร์มวิเคราะห์และพยากรณ์การลงทุนแบบ Multi-Agent: ค้นหาหุ้นได้ทั่วโลก ดูกราฟเทคนิคอล งบการเงิน
บทวิเคราะห์ของ AI สัญญาณซื้อขายพร้อมคะแนนความมั่นใจ และรับแจ้งเตือนผ่าน Telegram / LINE

> ⚠️ ระบบนี้ใช้เพื่อการศึกษาและประกอบการตัดสินใจเท่านั้น ไม่ใช่คำแนะนำการลงทุน
> ตัวเลขผลตอบแทนเป็น **ค่าคาดการณ์ทางสถิติ** (คำนวณจาก Historical Volatility + Sentiment) ไม่ใช่การรับประกันผล

---

## 1. ระบบทำงานอย่างไร

```
 เบราว์เซอร์ (แสดงผลเท่านั้น)              เซิร์ฟเวอร์ (สูตร/อัลกอริทึมทั้งหมดอยู่ที่นี่)
 ┌────────────────────────┐   /api/analyze  ┌─────────────────────────────────────────┐
 │ Smart Search           │ ──────────────▶ │ Orchestrator                            │
 │ กราฟ (วาดเส้นที่ได้มา)   │                 │  ├─ Agent A  Macro       (FRED, Perigon) │
 │ งบการเงิน               │ ◀── JSON ────── │  ├─ Agent B  Fundamental (FMP)           │
 │ Catalysts / Risks      │   ผลลัพธ์อย่างเดียว │  ├─ Agent C  Technical   (EMA/RSI/MACD/BB/S-R) │
 │ Sentiment / Thesis     │                 │  ├─ Scoring + Forecast engine           │
 │ กระดิ่งแจ้งเตือน          │                 │  └─ Agent D  Portfolio Manager (Claude)  │
 └────────────────────────┘                 └───────────────┬─────────────────────────┘
                                                            │ /api/scan (ทุก 30 นาที)
                                                            ▼
                                         Telegram · LINE · แจ้งเตือนในแอป · Supabase
```

| ส่วน | ไฟล์ |
|---|---|
| Agent A: Macro Analyst | `src/server/agents/macroAnalyst.ts` |
| Agent B: Fundamental Analyst | `src/server/agents/fundamentalAnalyst.ts` |
| Agent C: Technical Quant Engine | `src/server/agents/technicalQuant.ts` |
| Agent D: Portfolio Manager (Claude) | `src/server/agents/portfolioManager.ts` |
| คะแนนความมั่นใจ / สัญญาณ | `src/server/engine/scoring.ts` |
| พยากรณ์ ROI ตามกรอบเวลา | `src/server/engine/forecast.ts` |
| อินดิเคเตอร์ / แนวรับ-แนวต้าน | `src/server/engine/indicators.ts`, `levels.ts` |
| สแกนเนอร์ + แจ้งเตือน | `src/server/scanner.ts`, `src/server/notify/*` |
| หน้าจอแดชบอร์ด | `src/components/*` |

### การป้องกันการคัดลอกสูตร (IP Protection)
- โค้ดทั้งหมดใน `src/server/` ขึ้นต้นด้วย `import "server-only"` ถ้ามีใครเผลอนำไปใช้ในหน้าบ้าน **การ build จะล้มเหลวทันที**
- เบราว์เซอร์ได้รับเฉพาะผลลัพธ์ (ตัวเลข ข้อความ และจุดของเส้นกราฟที่คำนวณเสร็จแล้ว) ไม่มีสูตรหรือค่าน้ำหนักใดๆ ส่งไป
- ปิด Source map ฝั่งเบราว์เซอร์ (`productionBrowserSourceMaps: false`) และตั้ง security headers ไว้แล้ว
- API key ทุกตัวอ่านจาก environment ฝั่งเซิร์ฟเวอร์เท่านั้น (ห้ามตั้งชื่อขึ้นต้นด้วย `NEXT_PUBLIC_`)
- มี Rate limit ต่อ IP เพื่อกันการดูดข้อมูลจำนวนมาก
- ตรวจสอบได้เอง: หลัง `npm run build` ให้ค้นหาคำว่า `compositeScore` ใน `.next/static` จะไม่พบ

---

## 2. ติดตั้งและรันบนเครื่อง (ประมาณ 10 นาที)

1. ติดตั้ง **Node.js 20 ขึ้นไป** จาก https://nodejs.org (เลือกรุ่น LTS)
2. เปิด Terminal ในโฟลเดอร์นี้ แล้วพิมพ์:
   ```bash
   npm install
   cp .env.example .env.local
   npm run dev
   ```
3. เปิดเบราว์เซอร์ไปที่ http://localhost:3000

**ยังไม่ต้องมี API key ก็ใช้งานได้ทันที** ระบบจะใช้ข้อมูลจำลอง (DEMO) และแสดงแถบสีเหลืองบอกไว้
เมื่อใส่ key ในไฟล์ `.env.local` ระบบจะสลับไปใช้ข้อมูลจริงเองโดยอัตโนมัติ

## 3. API keys ที่ใช้ (ใส่ใน `.env.local`)

| ตัวแปร | ใช้ทำอะไร | สมัครที่ |
|---|---|---|
| `FMP_API_KEY` | ราคา, โปรไฟล์บริษัท, งบการเงิน, ปันผล, Consensus, ข่าว | financialmodelingprep.com |
| `FRED_API_KEY` | ดอกเบี้ย Fed, Bond yield, CPI, การว่างงาน, VIX | fred.stlouisfed.org (ฟรี) |
| `PERIGON_API_KEY` | ข่าวด่วนและ Sentiment | goperigon.com |
| `ANTHROPIC_API_KEY` | สมองหลัก Agent D (Claude) เขียนบทวิเคราะห์เป็นภาษาไทย | console.anthropic.com |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | ส่งแจ้งเตือนเข้า Telegram | คุยกับ @BotFather และ @userinfobot |
| `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_TARGET_USER_ID` | ส่งแจ้งเตือนเข้า LINE | developers.line.biz |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | เก็บประวัติการแจ้งเตือนถาวร | supabase.com |
| `ALERT_THRESHOLD` | เกณฑ์คะแนนขั้นต่ำที่จะแจ้งเตือน (ค่าเริ่มต้น 85) | – |
| `SCAN_UNIVERSE` | รายชื่อหุ้นที่สแกนอัตโนมัติ | – |
| `CRON_SECRET` | รหัสป้องกันไม่ให้คนอื่นสั่งสแกน | ตั้งเองเป็นข้อความสุ่มยาวๆ |

> **เรื่อง LINE:** บริการ LINE Notify ถูกปิดไปแล้วเมื่อ 31 มี.ค. 2025 ระบบนี้จึงใช้
> **LINE Messaging API** แทน (สร้าง LINE Official Account ฟรี → เปิด Messaging API → คัดลอก Channel access token
> และ User ID ของคุณจากหน้า Basic settings)

> **เรื่องโมเดล AI:** ในคำสั่งงานระบุ "GPT-6 Astra / Claude 6.0" ซึ่งยังไม่มีโมเดลชื่อนี้
> ระบบนี้ใช้ **Claude Opus 5.5** (`claude-opus-5-5`) ซึ่งเป็นรุ่นล่าสุดในปัจจุบัน เปลี่ยนรุ่นได้ที่ตัวแปร `ANTHROPIC_MODEL`
> ถ้าไม่ใส่ key ระบบจะใช้ rule engine เขียนบทวิเคราะห์แทน

## 4. นำขึ้นออนไลน์ (Vercel ฟรี)

1. Push โค้ดขึ้น GitHub (โค้ดอยู่ใน repo นี้แล้ว)
2. ไปที่ https://vercel.com → **Add New Project** → เลือก repo นี้
3. ในหน้า **Environment Variables** ให้ใส่ค่าเดียวกับใน `.env.local`
4. กด **Deploy** แล้วจะได้ลิงก์เว็บไซต์ใช้งานได้ทันที
5. สแกนเนอร์อัตโนมัติตั้งไว้แล้วใน `vercel.json` ให้รันทุก 30 นาที โดย Vercel จะส่ง `CRON_SECRET` ให้เอง
   (แพ็กเกจ Hobby ของ Vercel รัน Cron ได้วันละครั้ง ถ้าต้องการทุก 30 นาทีต้องใช้ Pro
   หรือใช้บริการฟรีอย่าง cron-job.org เรียก `GET https://<โดเมนของคุณ>/api/scan` พร้อม header `Authorization: Bearer <CRON_SECRET>`)

### ตั้งค่า Supabase (ไม่บังคับ)
1. สร้างโปรเจกต์ที่ supabase.com
2. ไปที่ **SQL Editor** → วางเนื้อหาไฟล์ `supabase/schema.sql` → กด **Run**
3. คัดลอก Project URL และ `service_role` key (Settings → API) ใส่ใน env
   ตารางเปิด Row Level Security และไม่มี policy สาธารณะ จึงมีแค่เซิร์ฟเวอร์เท่านั้นที่อ่าน/เขียนได้

## 5. วิธีอ่านผลลัพธ์

- **Confidence Score (1–100):** คำนวณจากความแรงของคะแนนรวมสามเอเจนต์ ความสอดคล้องกันของเอเจนต์ และระดับความผันผวน
  จากนั้น Agent D ปรับได้อีก ±10 คะแนน
- **Action:** `BUY` / `SELL` สำหรับหุ้น, `CALL` / `PUT` จะแนะนำเฉพาะตอนที่คะแนนสุดขั้ว โมเมนตัมแรง และมีความมั่นใจ ≥ 75
  (ออปชันเหมาะกับกรอบเวลาสั้น), `HOLD` เมื่อหลักฐานยังขัดแย้งกัน
- **Predictive ROI:** ตารางแสดงผลตอบแทนคาดการณ์ ช่วงความน่าจะเป็น 50% และโอกาสทำกำไร ในกรอบ 24 ชม. / 5 วัน / 1 เดือน / 3 เดือน / 6 เดือน
  ระบบเลือกกรอบเวลาที่ให้ Risk/Reward ดีที่สุดมาแสดงเป็นคำตอบหลัก
- **Stop-loss / Target:** อิง ATR ในอัตรา 2 : 3

## 6. คำสั่งที่มีให้ใช้

```bash
npm run dev        # โหมดพัฒนา
npm run build      # build สำหรับใช้งานจริง
npm start          # รันเวอร์ชันที่ build แล้ว
npm test           # ทดสอบสูตรคำนวณ (indicators, forecast, scoring)
npm run typecheck  # ตรวจชนิดข้อมูล TypeScript
```

## 7. ข้อจำกัดที่ควรรู้
- คำว่า "เรียลไทม์" ขึ้นอยู่กับแพ็กเกจ FMP ที่คุณสมัคร กราฟจะดึงราคาใหม่ทุก 15 วินาที
- หุ้นไทยใช้สัญลักษณ์ลงท้าย `.BK` (เช่น `PTT.BK`) หุ้นญี่ปุ่น `.T` หุ้นฮ่องกง `.HK` ข้อมูลหุ้นต่างประเทศบางตลาดต้องใช้ FMP แพ็กเกจที่สูงขึ้น
- Cache, rate limit และรายการแจ้งเตือนที่เก็บในหน่วยความจำ อยู่แยกในแต่ละ server instance ถ้าต้องการเก็บถาวรให้เปิดใช้ Supabase
- ไม่มีระบบใดพยากรณ์ตลาดได้แม่นยำ 100% ควรทดสอบย้อนหลัง (backtest) และใช้วินัยบริหารความเสี่ยงเสมอ
