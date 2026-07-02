import { test, expect, describe } from "vitest";
import { detectIntent } from "../src/utils/detectIntent.js";
import { getResolvedProviders } from "../src/router/providers/index.js";
import { createNewSession } from "../src/memory/store.js";
import fs from "fs";

describe("detectIntent", () => {
  test("harus mendeteksi intent coding", () => {
    expect(detectIntent("buat komponen X")).toBe("code");
    expect(detectIntent("bikin folder utils")).toBe("code");
    expect(detectIntent("edit src/app.tsx")).toBe("code");
    expect(detectIntent("hapus test.js")).toBe("code");
  });

  test("harus mendeteksi intent chat", () => {
    expect(detectIntent("apa kabar")).toBe("chat");
    expect(detectIntent("jelaskan apa itu react")).toBe("chat");
    expect(detectIntent("halo pilot")).toBe("chat");
    expect(detectIntent("kenapa error?")).toBe("chat");
  });

  test("ambigu harus fallback ke chat", () => {
    expect(detectIntent("aku mau makan")).toBe("chat");
    expect(detectIntent("add me to the list")).toBe("chat"); 
  });
});

describe("getResolvedProviders", () => {
  test("me-return struktur array ProviderConfig", () => {
    const providers = getResolvedProviders();
    expect(Array.isArray(providers)).toBe(true);
    if (providers.length > 0) {
      expect(providers[0]).toHaveProperty("name");
      expect(providers[0]).toHaveProperty("status");
    }
  });
});

describe("memory", () => {
  test("memastikan object format benar saat membuat session", () => {
    const projectPath = "/test/dummy/path/" + Math.random().toString();
    const session = createNewSession(projectPath);
    
    expect(session).toHaveProperty("id");
    expect(session).toHaveProperty("projectHash");
    expect(session).toHaveProperty("projectPath", projectPath);
    expect(session).toHaveProperty("createdAt");
    expect(session).toHaveProperty("updatedAt");
    expect(session).toHaveProperty("messages");
    expect(Array.isArray(session.messages)).toBe(true);
  });
});
