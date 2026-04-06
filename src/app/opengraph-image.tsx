import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "GeoSight — Spatial Intelligence Platform";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0a0a0f",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "flex-end",
          padding: "72px 80px",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Globe glow backdrop */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -80,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(0,229,255,0.18) 0%, rgba(0,229,255,0.04) 55%, transparent 75%)",
          }}
        />
        {/* Grid lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(0,229,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.04) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />

        {/* Eyebrow */}
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#00e5ff",
            marginBottom: 20,
            display: "flex",
          }}
        >
          Spatial Intelligence
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.1,
            color: "#f0f0f4",
            marginBottom: 24,
            maxWidth: 780,
            display: "flex",
            flexWrap: "wrap",
          }}
        >
          GeoSight
        </div>

        {/* Subheadline */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 400,
            lineHeight: 1.5,
            color: "#8888aa",
            maxWidth: 680,
            display: "flex",
          }}
        >
          Ask questions about any place on Earth with live geospatial data, AI reasoning, and interactive 3D map context.
        </div>

        {/* Bottom domain pill */}
        <div
          style={{
            position: "absolute",
            bottom: 72,
            right: 80,
            fontSize: 14,
            fontWeight: 600,
            color: "#00e5ff",
            letterSpacing: "0.1em",
            display: "flex",
          }}
        >
          geosight-gspat.vercel.app
        </div>
      </div>
    ),
    { ...size },
  );
}
