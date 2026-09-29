import test from "node:test";
import assert from "node:assert/strict";
import { createMailer } from "../server/mailer.js";
test("Brevo transport sends server-side plain-text email with bounded timeout", async () => {
  let request;
  const mailer = createMailer({
    provider: "brevo",
    key: "test-only-not-a-real-key",
    sender: "sender@example.com",
    fetchImpl: async (url, options) => {
      request = { url, options };
      return new Response("{}", { status: 201 });
    },
  });
  assert.equal(mailer.ready, true);
  await mailer.send({
    to: "recipient@example.com",
    subject: "Confirm",
    text: "Test message",
  });
  assert.equal(request.url, "https://api.brevo.com/v3/smtp/email");
  assert.equal(request.options.headers["api-key"], "test-only-not-a-real-key");
  assert.equal(JSON.parse(request.options.body).textContent, "Test message");
  assert.ok(request.options.signal instanceof AbortSignal);
});
test("Disabled, incomplete and failed mail transports never leak provider content", async () => {
  let called = false;
  const mailer = createMailer({
    provider: "off",
    fetchImpl: async () => {
      called = true;
    },
  });
  assert.equal(mailer.ready, false);
  await assert.rejects(mailer.send({}), /MAIL_UNAVAILABLE/);
  assert.equal(called, false);
  assert.equal(
    createMailer({ provider: "brevo", key: "", sender: "sender@example.com" })
      .ready,
    false,
  );
  const failed = createMailer({
    provider: "brevo",
    key: "test",
    sender: "sender@example.com",
    fetchImpl: async () =>
      new Response("private provider error", { status: 401 }),
  });
  await assert.rejects(
    failed.send({ to: "r@example.com", subject: "Test", text: "Test" }),
    { message: "MAIL_DELIVERY_FAILED" },
  );
});
