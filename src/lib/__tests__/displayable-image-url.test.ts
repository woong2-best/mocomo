import test from "node:test";
import assert from "node:assert/strict";
import {
  displayableImageUrl,
  isPublicHttpUrl,
} from "@/lib/displayable-image-url";

test("isPublicHttpUrl accepts https, same-origin paths, and localhost http", () => {
  assert.equal(isPublicHttpUrl("https://cdn.mocomo.net/uploads/a.jpg"), true);
  assert.equal(isPublicHttpUrl("/uploads/avatar.jpg"), true);
  assert.equal(isPublicHttpUrl("http://localhost:3000/uploads/a.jpg"), true);
});

test("isPublicHttpUrl rejects device and opaque URIs that Zod .url() would allow", () => {
  assert.equal(isPublicHttpUrl("file:///data/user/0/cache/avatar.jpg"), false);
  assert.equal(isPublicHttpUrl("content://media/external/images/1"), false);
  assert.equal(isPublicHttpUrl("ph://A1B2C3"), false);
  assert.equal(isPublicHttpUrl("blob:https://mocomo.net/uuid"), false);
  assert.equal(isPublicHttpUrl("data:image/jpeg;base64,xxxx"), false);
  assert.equal(isPublicHttpUrl("http://evil.example/a.jpg"), false);
  assert.equal(isPublicHttpUrl("  "), false);
  assert.equal(isPublicHttpUrl(null), false);
});

test("displayableImageUrl trims and nulls junk", () => {
  assert.equal(
    displayableImageUrl("  https://lh3.googleusercontent.com/a/x  "),
    "https://lh3.googleusercontent.com/a/x"
  );
  assert.equal(displayableImageUrl("file:///tmp/a.jpg"), null);
});
