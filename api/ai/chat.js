"use strict";

/*
 * RightAware AI
 * Temporary stable production endpoint.
 * This version intentionally keeps the serverless function simple
 * so we can verify the OpenAI connection first.
 */

const DISCLAIMER =
  "General legal information only — not legal advice. Verify important points with a qualified professional.";

const MODEL =
  process.env.AI_MODEL || "gpt-6-luna";

const API_URL =
  process.env.AI_BASE_URL ||
  "https://api.openai.com/v1/responses";

const SYSTEM = `
You are RightAware AI, the Nigerian civic and legal-awareness assistant.

Your job is to help Nigerians understand their rights, civic responsibilities
and general legal information in simple language.

You are not a lawyer and you do not provide legal advice.

Important rules:

1. Never invent Nigerian laws, legal sections, cases, statistics,
organisations, phone numbers, emails or URLs.

2. If you do not have enough verified information, say so clearly.

3. If the user writes Nigerian Pidgin, respond naturally in Nigerian Pidgin.

4. If the user mixes English and Nigerian Pidgin, respond naturally
in the same style.

5. If someone says they have been arrested, threatened or are in immediate
danger, give practical safety guidance first.

6. Never request passwords, PINs, OTPs or bank details.

7. Keep responses clear and concise.

8. End every response with:

General legal information only — not legal advice. Verify important points with a qualified professional.
`;

module.exports = async function (req, res) {

  /*
   * Only POST is allowed.
   */
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "POST only."
    });
  }

  /*
   * Confirm that the server actually has the key.
   */
  const apiKey = process.env.AI_API_KEY;

  if (!apiKey) {
    return res.status(200).json({
      ok: false,
      diagnostic: true,
      text:
        "RightAware AI diagnostic:\n\n" +
        "AI_API_KEY is NOT available to this Production deployment.\n\n" +
        "Check Vercel Environment Variables.",
      disclaimer: DISCLAIMER
    });
  }

  /*
   * Read request body.
   */
  let body = req.body;

  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (error) {
      return res.status(400).json({
        ok: false,
        error: "Invalid JSON request."
      });
    }
  }

  body = body || {};

  const message =
    typeof body.message === "string"
      ? body.message.trim()
      : "";

  if (!message) {
    return res.status(400).json({
      ok: false,
      error: "Please provide a message."
    });
  }

  if (message.length > 2000) {
    return res.status(400).json({
      ok: false,
      error: "Message is too long."
    });
  }

  /*
   * Send request to OpenAI Responses API.
   */
  try {

    const response = await fetch(API_URL, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + apiKey
      },

      body: JSON.stringify({
        model: MODEL,

        instructions: SYSTEM,

        input: message,

        max_output_tokens: 900
      })
    });

    /*
     * Read the provider response.
     */
    const providerText =
      await response.text();

    let providerData = null;

    try {
      providerData =
        JSON.parse(providerText);
    } catch (error) {
      providerData = null;
    }

    /*
     * Provider returned an error.
     */
    if (!response.ok) {

      const providerMessage =
        providerData &&
        providerData.error &&
        providerData.error.message
          ? providerData.error.message
          : providerData &&
            providerData.message
          ? providerData.message
          : providerText
          ? providerText.slice(0, 500)
          : "No provider error message.";

      console.error(
        "RIGHTAWARE_OPENAI_ERROR",
        response.status,
        providerMessage
      );

      /*
       * Return 200 temporarily so the website
       * displays the diagnostic instead of hiding it.
       */
      return res.status(200).json({
        ok: false,
        diagnostic: true,

        text:
          "RightAware AI connection diagnostic:\n\n" +
          "OpenAI status: " +
          response.status +
          "\n\n" +
          providerMessage,

        disclaimer:
          "Temporary technical diagnostic."
      });
    }

    /*
     * Extract Responses API output.
     */
    const outputText =
      providerData &&
      typeof providerData.output_text === "string"
        ? providerData.output_text.trim()
        : "";

    /*
     * Provider responded but no text was found.
     */
    if (!outputText) {

      console.error(
        "RIGHTAWARE_OPENAI_NO_OUTPUT",
        providerData
      );

      return res.status(200).json({
        ok: false,
        diagnostic: true,

        text:
          "RightAware AI connection diagnostic:\n\n" +
          "OpenAI accepted the request, but the response did not contain output_text.\n\n" +
          "Model used: " +
          MODEL,

        disclaimer:
          "Temporary technical diagnostic."
      });
    }

    /*
     * SUCCESS.
     */
    return res.status(200).json({

      ok: true,

      text: outputText,

      links: [],

      sources: [],

      disclaimer: DISCLAIMER,

      model: MODEL
    });

  } catch (error) {

    console.error(
      "RIGHTAWARE_AI_FUNCTION_ERROR",
      error
    );

    return res.status(200).json({
      ok: false,
      diagnostic: true,

      text:
        "RightAware AI connection diagnostic:\n\n" +
        (
          error &&
          error.message
            ? error.message
            : "Unknown server error."
        ),

      disclaimer:
        "Temporary technical diagnostic."
    });
  }
};