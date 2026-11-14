"use client";
import { useEffect, useRef, useState } from "react";
import {
  createChart, ColorType, CrosshairMode, LineStyle,
  type IChartApi, type ISeriesApi, type UTCTimestamp, type LogicalRange,
} from "lightweight-charts";
import type { ChartPayload } from "@/server/types";

// Pure rendering: every series here (EMA, Bollinger, RSI, MACD, S/R) is
// pre-computed on the server. The browser only draws it.

const base = {
  layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#8b98b8", fontSize: 11 },
  grid: { vertLines: { color: "rgba(38,52,90,.35)" }, horzLines: { color: "rgba(38,52,90,.35)" } },
  rightPriceScale: { borderColor: "#26345a" },
  timeScale: { borderColor: "#26345a", timeVisible: false },
  crosshair: { mode: CrosshairMode.Normal },
};

const ts = (t: number) => t as UTCTimestamp;

export default function PriceChart({ symbol, data, currency }: { symbol: string; data: ChartPayload; currency: string }) {
  const mainRef = useRef<HTMLDivElement>(null);
  const rsiRef = useRef<HTMLDivElement>(null);
  const macdRef = useRef<HTMLDivElement>(null);
  const candleRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const [show, setShow] = useState({ ema: true, bb: true, levels: true });
  const [live, setLive] = useState<{ price: number; live: boolean } | null>(null);

  useEffect(() => {
    if (!mainRef.current || !rsiRef.current || !macdRef.current) return;
    const charts: IChartApi[] = [];
    const main = createChart(mainRef.current, { ...base, height: 380, autoSize: true });
    const rsiC = createChart(rsiRef.current, { ...base, height: 110, autoSize: true });
    const macdC = createChart(macdRef.current, { ...base, height: 110, autoSize: true });
    charts.push(main, rsiC, macdC);

    const candles = main.addCandlestickSeries({
      upColor: "#16c784", downColor: "#ea3943", borderVisible: false, wickUpColor: "#16c784", wickDownColor: "#ea3943",
    });
    candles.setData(data.candles.map((c) => ({ time: ts(c.time), open: c.open, high: c.high, low: c.low, close: c.close })));
    candleRef.current = candles;

    const vol = main.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "vol", color: "rgba(59,130,246,.25)" });
    main.priceScale("vol").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });
    vol.setData(data.candles.map((c) => ({ time: ts(c.time), value: c.volume, color: c.close >= c.open ? "rgba(22,199,132,.25)" : "rgba(234,57,67,.25)" })));

    if (show.ema) {
      main.addLineSeries({ color: "#f5b301", lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
        .setData(data.overlays.ema20.map((p) => ({ time: ts(p.time), value: p.value })));
      main.addLineSeries({ color: "#a855f7", lineWidth: 1, priceLineVisible: false, lastValueVisible: false })
        .setData(data.overlays.ema50.map((p) => ({ time: ts(p.time), value: p.value })));
    }
    if (show.bb) {
      for (const band of [data.overlays.bbUpper, data.overlays.bbLower]) {
        main.addLineSeries({ color: "rgba(59,130,246,.6)", lineWidth: 1, lineStyle: LineStyle.Dotted, priceLineVisible: false, lastValueVisible: false })
          .setData(band.map((p) => ({ time: ts(p.time), value: p.value })));
      }
    }
    if (show.levels) {
      for (const l of data.levels) {
        candles.createPriceLine({
          price: l.price, color: l.kind === "support" ? "#16c784" : "#ea3943", lineWidth: 1,
          lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: `${l.kind === "support" ? "S" : "R"}${"•".repeat(l.strength)}`,
        });
      }
    }
    candles.setMarkers(data.markers.map((m) => ({ time: ts(m.time), position: m.position, color: m.color, shape: m.position === "belowBar" ? "arrowUp" : "arrowDown", text: m.text })));

    const rsiS = rsiC.addLineSeries({ color: "#f5b301", lineWidth: 1, priceLineVisible: false });
    rsiS.setData(data.rsi.map((p) => ({ time: ts(p.time), value: p.value })));
    rsiS.createPriceLine({ price: 70, color: "#ea3943", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: "70" });
    rsiS.createPriceLine({ price: 30, color: "#16c784", lineWidth: 1, lineStyle: LineStyle.Dotted, axisLabelVisible: false, title: "30" });

    macdC.addHistogramSeries({ priceLineVisible: false })
      .setData(data.macd.map((p) => ({ time: ts(p.time), value: p.hist, color: p.hist >= 0 ? "rgba(22,199,132,.6)" : "rgba(234,57,67,.6)" })));
    macdC.addLineSeries({ color: "#3b82f6", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }).setData(data.macd.map((p) => ({ time: ts(p.time), value: p.macd })));
    macdC.addLineSeries({ color: "#f97316", lineWidth: 1, priceLineVisible: false, lastValueVisible: false }).setData(data.macd.map((p) => ({ time: ts(p.time), value: p.signal })));

    // Sync the three panes
    let syncing = false;
    const sync = (src: IChartApi) => (range: LogicalRange | null) => {
      if (syncing || !range) return;
      syncing = true;
      charts.filter((c) => c !== src).forEach((c) => c.timeScale().setVisibleLogicalRange(range));
      syncing = false;
    };
    charts.forEach((c) => c.timeScale().subscribeVisibleLogicalRangeChange(sync(c)));
    main.timeScale().setVisibleLogicalRange({ from: data.candles.length - 130, to: data.candles.length + 3 });

    return () => { charts.forEach((c) => c.remove()); candleRef.current = null; };
  }, [data, show]);

  // Real-time tick: update the last candle every 15s
  useEffect(() => {
    let stop = false;
    const lastBar = { ...data.candles[data.candles.length - 1] };
    const tick = async () => {
      try {
        const res = await fetch(`/api/quote/${encodeURIComponent(symbol)}?ref=${lastBar.close}`);
        const q = await res.json();
        if (stop || !q?.price) return;
        lastBar.close = q.price;
        lastBar.high = Math.max(lastBar.high, q.price);
        lastBar.low = Math.min(lastBar.low, q.price);
        candleRef.current?.update({ time: ts(lastBar.time), open: lastBar.open, high: lastBar.high, low: lastBar.low, close: lastBar.close });
        setLive({ price: q.price, live: q.live });
      } catch { /* ignore */ }
    };
    tick();
    const id = setInterval(tick, 15_000);
    return () => { stop = true; clearInterval(id); };
  }, [symbol, data]);

  const Toggle = ({ k, label }: { k: keyof typeof show; label: string }) => (
    <button onClick={() => setShow((s) => ({ ...s, [k]: !s[k] }))} className={`chip ${show[k] ? "border-accent/60 text-white" : "opacity-60"}`}>{label}</button>
  );

  return (
    <div className="panel">
      <div className="panel-title">
        <span>Technical Chart · {symbol}</span>
        <div className="flex items-center gap-2 normal-case tracking-normal">
          <Toggle k="ema" label="EMA 20/50" />
          <Toggle k="bb" label="Bollinger" />
          <Toggle k="levels" label="แนวรับ/ต้าน" />
          {live && (
            <span className="chip">
              <span className={`h-1.5 w-1.5 rounded-full ${live.live ? "animate-pulse bg-bull" : "bg-gold"}`} />
              <span className="num">{live.price.toFixed(2)} {currency}</span>
              <span className="text-slate-500">{live.live ? "LIVE" : "DEMO"}</span>
            </span>
          )}
        </div>
      </div>
      <div className="px-2">
        <div ref={mainRef} className="h-[380px] w-full" />
        <div className="mt-1 px-2 text-[10px] uppercase tracking-wider text-slate-500">RSI (14)</div>
        <div ref={rsiRef} className="h-[110px] w-full" />
        <div className="mt-1 px-2 text-[10px] uppercase tracking-wider text-slate-500">MACD (12, 26, 9)</div>
        <div ref={macdRef} className="h-[110px] w-full pb-2" />
      </div>
    </div>
  );
}
