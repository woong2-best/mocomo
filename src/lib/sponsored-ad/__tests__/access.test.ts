import { describe, expect, it } from "vitest";
import { canRegisterSponsoredAdComplimentary } from "@/lib/sponsored-ad/access";

describe("canRegisterSponsoredAdComplimentary", () => {
  it("allows operator usernames regardless of role", () => {
    expect(canRegisterSponsoredAdComplimentary({ username: "admin", role: "USER" })).toBe(true);
    expect(canRegisterSponsoredAdComplimentary({ username: "mocomocompany", role: "USER" })).toBe(
      true
    );
  });

  it("allows ADMIN+ CMS roles", () => {
    expect(canRegisterSponsoredAdComplimentary({ username: "alice", role: "ADMIN" })).toBe(true);
    expect(canRegisterSponsoredAdComplimentary({ username: "alice", role: "SUPER_ADMIN" })).toBe(
      true
    );
    expect(canRegisterSponsoredAdComplimentary({ username: "alice", role: "OWNER" })).toBe(true);
  });

  it("does not allow regular users or lower staff", () => {
    expect(canRegisterSponsoredAdComplimentary({ username: "alice", role: "USER" })).toBe(false);
    expect(canRegisterSponsoredAdComplimentary({ username: "alice", role: "MODERATOR" })).toBe(
      false
    );
    expect(canRegisterSponsoredAdComplimentary({ username: "alice", role: "MARKETING" })).toBe(
      false
    );
  });
});
