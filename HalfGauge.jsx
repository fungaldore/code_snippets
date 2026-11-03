// Demonstrating an animated spedometer style gauge I designed.

import { useEffect, useRef } from "react";

// Inject animation styles once per page load
(function injectStyles() {
  if (typeof document === "undefined") return;
  const styleId = "__modern-half-gauge-styles__";
  if (document.getElementById(styleId)) return;
  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = `
    @keyframes modern-gauge-fill-arc {
      from { stroke-dasharray: var(--mg-initial-dash, 0) 500; }
      to   { stroke-dasharray: var(--mg-final-dash, 0) 500; }
    }
    @keyframes modern-gauge-fill-tick {
      from { stroke: #9e9e9e; }
      to   { stroke: var(--mg-tick-color, #9e9e9e); }
    }
    .modern-gauge-arc {
      animation: modern-gauge-fill-arc 1s ease-out forwards;
    }
    .modern-gauge-tick {
      animation: modern-gauge-fill-tick 1s ease-out forwards;
      animation-delay: var(--mg-tick-delay, 0s);
    }
  `;
  document.head.appendChild(style);
})();

const GaugeInner = ({ value, colors, title, minMax }) => {
  const radius = 40;
  const centerX = 50;
  const centerY = 45;
  const minX = 10;
  const maxX = 90;

  const minMaxArray = minMax || [0, 5, 10, 15, 20];
  const minValue = minMaxArray.at(0) ?? 0;
  const maxValue = minMaxArray.at(-1) ?? 1;
  const currentValue = value ?? minValue;

  // Stable unique ID per instance for SVG gradient referencing
  const id = useRef(`mg-${Math.random().toString(36).substring(2, 9)}`).current;

  // Track previous value to animate from it on each update
  const preVal = useRef(minValue);
  useEffect(() => {
    const timer = setTimeout(() => {
      preVal.current = currentValue;
    }, 1000); // Match animation duration
    return () => clearTimeout(timer);
  }, [currentValue]);

  const valueRange = maxValue - minValue || 1;
  const prevFraction = Math.min(
    1,
    Math.max(0, (preVal.current - minValue) / valueRange),
  );
  const currentFraction = Math.min(
    1,
    Math.max(0, (currentValue - minValue) / valueRange),
  );

  const arcLength = Math.PI * radius;
  const filledLength = currentFraction * arcLength;
  const prevFilledLength = prevFraction * arcLength;

  // Build tick list, inserting minor ticks between major ticks
  const shouldLabelEveryOther = minMaxArray.length > 8;
  let allTicks = [];
  if (minMaxArray.length < 17) {
    const minorTicksPerGap = minMaxArray.length < 6 ? 4 : 2;
    const divisor = minorTicksPerGap + 1;
    for (let i = 0; i < minMaxArray.length; i++) {
      allTicks.push({ value: minMaxArray[i], isMajor: true });
      if (i < minMaxArray.length - 1) {
        const curr = minMaxArray[i];
        const next = minMaxArray[i + 1];
        const step = (next - curr) / divisor;
        for (let j = 1; j <= minorTicksPerGap; j++) {
          allTicks.push({ value: curr + j * step, isMajor: false });
        }
      }
    }
  } else {
    allTicks = minMaxArray.map((v) => ({ value: v, isMajor: true }));
  }

  // Compute geometry for each tick
  const majorTicks = allTicks.filter((t) => t.isMajor);
  const tickData = allTicks.map((tick, i) => {
    const maxIndex = allTicks.length - 1;
    const angle = (i / maxIndex) * 180;
    const radians = (angle - 180) * (Math.PI / 180);
    const tickRadius = radius - 4;
    const tickLength = tick.isMajor ? 5 : 2.5;

    const majorIndex = majorTicks.indexOf(tick);
    const showLabel =
      tick.isMajor && (!shouldLabelEveryOther || majorIndex % 2 === 0);

    const outerX = centerX + tickRadius * Math.cos(radians);
    const outerY = centerY + tickRadius * Math.sin(radians);
    const innerX = centerX + (tickRadius - tickLength) * Math.cos(radians);
    const innerY = centerY + (tickRadius - tickLength) * Math.sin(radians);
    const labelRadius = tickRadius - 10;
    const labelX = centerX + labelRadius * Math.cos(radians);
    const labelY = centerY + labelRadius * Math.sin(radians);

    return {
      value: tick.value,
      innerX,
      innerY,
      outerX,
      outerY,
      labelX,
      labelY,
      showLabel,
    };
  });

  const gradientColors =
    colors && colors.length >= 2 ? colors : ["#f44336", "#9c27b0"];

  return (
    <div style={{ height: "100%", width: "100%", paddingBottom: "8px" }}>
      {/* key=value causes this subtree to remount on change, restarting CSS animations */}
      <div
        key={currentValue}
        style={{ width: "100%", height: "100%", position: "relative" }}
      >
        <svg width="100%" height="100%" viewBox="0 0 100 55">
          <defs>
            <linearGradient
              id={`gradient-${id}`}
              gradientUnits="userSpaceOnUse"
              x1={minX}
              y1={centerY}
              x2={maxX}
              y2={centerY}
            >
              {gradientColors.map((color, index) => (
                <stop
                  key={index}
                  offset={`${(index / (gradientColors.length - 1)) * 100}%`}
                  stopColor={color}
                />
              ))}
            </linearGradient>
          </defs>

          {/* Background arc */}
          <path
            stroke="#9e9e9e"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
            d={`M ${minX} ${centerY} A ${radius} ${radius} 0 1 1 ${maxX} ${centerY}`}
          />

          {/* Animated gradient arc */}
          <path
            className="modern-gauge-arc"
            fill="none"
            strokeWidth="3"
            stroke={`url(#gradient-${id})`}
            strokeLinecap="round"
            strokeDashoffset="0"
            style={{
              "--mg-initial-dash": `${prevFilledLength}`,
              "--mg-final-dash": `${filledLength}`,
            }}
            d={`M ${minX} ${centerY} A ${radius} ${radius} 0 1 1 ${maxX} ${centerY}`}
          />

          {/* Tick marks */}
          {tickData.map((tick, index) => {
            const tickFraction = index / (tickData.length - 1);
            const shouldFill = tickFraction <= currentFraction;
            const tickDelay = tickFraction; // 0s–1s stagger

            return (
              <g key={tick.value}>
                {/* Base gray tick (always visible, prevents flash before animation) */}
                <line
                  x1={tick.innerX}
                  y1={tick.innerY}
                  x2={tick.outerX}
                  y2={tick.outerY}
                  strokeWidth="1"
                  strokeLinecap="round"
                  stroke="#9e9e9e"
                />
                {/* Animated gradient tick */}
                <line
                  className="modern-gauge-tick"
                  x1={tick.innerX}
                  y1={tick.innerY}
                  x2={tick.outerX}
                  y2={tick.outerY}
                  strokeWidth="1"
                  strokeLinecap="round"
                  style={{
                    "--mg-tick-color": `url(#gradient-${id})`,
                    "--mg-tick-delay": shouldFill ? `${tickDelay}s` : "0s",
                    animationPlayState: shouldFill ? "running" : "paused",
                  }}
                />
                {tick.showLabel && (
                  <text
                    x={tick.labelX}
                    y={tick.labelY}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="5"
                    fill="#9e9e9e"
                    fontFamily="sans-serif"
                  >
                    {tick.value}
                  </text>
                )}
              </g>
            );
          })}
          {/* Value label */}
          <text
            x={centerX}
            y={40}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="14"
            fontWeight="500"
            fill="currentColor"
            fontFamily="sans-serif"
          >
            {value}
          </text>
        </svg>

        {/* Title label */}
        {title && (
          <div
            style={{
              position: "absolute",
              bottom: 0,
              width: "100%",
              textAlign: "center",
              fontSize: "0.9rem",
              color: "#9e9e9e",
              pointerEvents: "none",
            }}
          >
            {title}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * HalfGauge — an animated half-circle gauge component.
 *
 * @param {object} props
 * @param {number}   props.value    - Current value to display.
 * @param {number[]} [props.minMax] - Ordered scale values (first = min, last = max). Defaults to [0, 5, 10, 15, 20].
 * @param {string[]} [props.colors] - Two or more CSS colors forming the fill gradient.
 * @param {string}   [props.title]  - Optional label shown below the value.
 */
const HalfGauge = ({ value, colors, title, minMax }) => (
  <GaugeInner value={value} colors={colors} title={title} minMax={minMax} />
);

export default HalfGauge;
