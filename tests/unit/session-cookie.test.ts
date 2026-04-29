import { describe, expect, it } from "vitest";
import { resolveSessionCookieSecure } from "@/lib/auth/session";

describe("session cookie security", () => {
  it("does not mark cookies secure for local http deployments", () => {
    expect(
      resolveSessionCookieSecure({
        nodeEnv: "production",
        requestUrl: "http://127.0.0.1:3000/api/auth/login"
      })
    ).toBe(false);
  });

  it("marks cookies secure for https deployments", () => {
    expect(
      resolveSessionCookieSecure({
        nodeEnv: "production",
        requestUrl: "https://gallery.example.com/api/auth/login"
      })
    ).toBe(true);
  });

  it("uses forwarded proto when the app is behind an https proxy", () => {
    expect(
      resolveSessionCookieSecure({
        nodeEnv: "production",
        requestUrl: "http://app:3000/api/auth/login",
        forwardedProto: "https"
      })
    ).toBe(true);
  });

  it("allows an explicit env override", () => {
    expect(
      resolveSessionCookieSecure({
        nodeEnv: "production",
        requestUrl: "https://gallery.example.com/api/auth/login",
        explicitSecure: "false"
      })
    ).toBe(false);

    expect(
      resolveSessionCookieSecure({
        nodeEnv: "development",
        requestUrl: "http://127.0.0.1:3000/api/auth/login",
        explicitSecure: "true"
      })
    ).toBe(true);
  });
});
