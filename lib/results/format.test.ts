import { describe, it, expect } from "vitest";
import { parseTime, formatTime, formatValue } from "./format";

describe("parseTime", () => {
  it("parses mm:ss", () => expect(parseTime("19:42")).toBe(1182));
  it("parses mm:ss.t", () => expect(parseTime("19:42.5")).toBe(1182.5));
  it("parses h:mm:ss", () => expect(parseTime("1:02:03")).toBe(3723));
  it("parses bare seconds", () => expect(parseTime("58.4")).toBeCloseTo(58.4));
  it("throws on garbage", () => expect(() => parseTime("abc")).toThrow());
  it("throws on empty", () => expect(() => parseTime("")).toThrow());
});

describe("formatTime", () => {
  it("formats mm:ss", () => expect(formatTime(1182)).toBe("19:42"));
  it("formats tenths", () => expect(formatTime(1182.5)).toBe("19:42.5"));
  it("formats hours", () => expect(formatTime(3723)).toBe("1:02:03"));
  it("pads seconds", () => expect(formatTime(65)).toBe("1:05"));
});

describe("formatValue", () => {
  it("times", () => expect(formatValue(1182, "TIME")).toBe("19:42"));
  it("distance", () => expect(formatValue(12.4, "DISTANCE")).toBe("12.40 m"));
  it("weight", () => expect(formatValue(52.5, "WEIGHT")).toBe("52.5 kg"));
  it("points", () => expect(formatValue(128, "POINTS")).toBe("128"));
});
