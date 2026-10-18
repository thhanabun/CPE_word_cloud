"use client";

import cloud from "d3-cloud";
import { useEffect, useRef, useState } from "react";
import type { Word } from "@/lib/types";

type PositionedWord = Word & { text: string; x: number; y: number; size: number; rotate: number };

const palette = ["#17594a", "#b45327", "#a23a55", "#596b38", "#7952a0", "#276e81"];

export default function WordCloud({ words }: { words: Word[] }) {
  const host = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 800, height: 420 });
  const [positioned, setPositioned] = useState<PositionedWord[]>([]);

  useEffect(() => {
    if (!host.current) return;
    const observer = new ResizeObserver(([entry]) => {
      setSize({ width: Math.max(280, entry.contentRect.width), height: Math.max(280, entry.contentRect.height) });
    });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!words.length) {
      setPositioned([]);
      return;
    }
    const min = Math.min(...words.map((word) => word.count));
    const max = Math.max(...words.map((word) => word.count));
    const range = Math.sqrt(max) - Math.sqrt(min);
    const maxFontSize = Math.min(78, size.width / 9);
    const layout = cloud<PositionedWord>()
      .size([size.width - 20, size.height - 20])
      .words(words.map((word) => ({
        ...word,
        text: word.display_text,
        x: 0,
        y: 0,
        rotate: 0,
        size: Math.max(9, Math.min(
          words.length === 1 ? 22 + maxFontSize : range === 0 ? 38 : 22 + ((Math.sqrt(word.count) - Math.sqrt(min)) / range) * maxFontSize,
          (size.width - 54) / ([...new Intl.Segmenter("th", { granularity: "grapheme" }).segment(word.display_text)].length * 0.95),
        )),
      })))
      .padding(8)
      .rotate(0)
      .font('"Mali", sans-serif')
      .fontSize((word) => word.size)
      .on("end", (placed) => setPositioned(placed));
    layout.start();
    return () => { layout.stop(); };
  }, [words, size]);

  return (
    <div className="word-cloud" ref={host} aria-label="กลุ่มคำตอบจากนักอ่าน">
      {!words.length ? (
        <div className="cloud-empty"><span className="empty-spark">✳</span><p>ทุกคำตอบเริ่มจากใครสักคน</p><span>ส่งคำแรกของวันนี้ได้เลย</span></div>
      ) : (
        <svg viewBox={`0 0 ${size.width} ${size.height}`} role="img" aria-label={`${words.length} คำตอบ`}>
          {positioned.map((word, index) => (
            <text
              key={word.id}
              textAnchor="middle"
              transform={`translate(${size.width / 2 + word.x},${size.height / 2 + word.y}) rotate(${word.rotate})`}
              style={{ fontSize: word.size, fill: palette[index % palette.length], fontWeight: word.count > 1 ? 700 : 500 }}
            >
              {word.display_text}
            </text>
          ))}
        </svg>
      )}
    </div>
  );
}
