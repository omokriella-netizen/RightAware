"use strict";

/*
 * RIGHTAWARE AI
 * Production AI endpoint
 *
 * Uses OpenAI Responses API.
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
and general legal information in simple, clear language.

You are not a lawyer and you do not provide legal advice.

RULES:

1. Never invent Nigerian laws, legal sections, cases, statistics,
organisations, phone numbers, emails or URLs.

2. If you do not have enough verified information, say so clearly.

3. If the user writes Nigerian Pidgin, respond naturally in Nigerian Pidgin.

4. If the user mixes English and Nigerian Pidgin, respond naturally
in the same style.

5. If someone says they have been arrested, threatened or is in immediate
danger, give practical safety guidance first.

6. Never request passwords, PINs, OTPs or bank details.

7. Answer the user's actual question directly.

8. Use short paragraphs and bullet points where useful.

9. Keep answers concise.

10. End every answer with:

General legal information only — not legal advice. Verify important points with a qualified professional.
`;


/* ---------------------------------------------------------
   Extract text from the OpenAI Responses API response.
   --------------------------------------------------------- */

function extractResponseText(data) {

  /*
   * Some responses may expose output_text directly.
   */
  if (
    data &&
    typeof data.output_text === "string" &&
    data.output_text.trim()
  ) {
    return data.output_text.trim();
  }

  /*
   * Standard Responses API structure:
   *
   * output[
   *   {
   *     type: "message",
   *     content: [
   *       {
   *         type: "output_text",
   *         text: "..."
   *       }
   *     ]
   *   }
   * ]
   */

  if (
    data &&
    Array.isArray(data.output)
  ) {

    const pieces = [];

    for (
      let i = 0;
      i < data.output.length;
      i++
    ) {

      const item = data.output[i];

      if (
        !item ||
        !Array.isArray(item.content)
      ) {
        continue;
      }

      for (
        let j = 0;
        j < item.content.length;
        j++
      ) {

        const part =
          item.content[j];

        if (
          part &&
          typeof part.text === "string"
        ) {
          pieces.push(part.text);
        }

      }
    }

    if (pieces.length) {
      return pieces.join("\n").trim();
    }
  }

  /*
   * Additional defensive formats.
   */

  if (
    data &&
    data.message &&
    Array.isArray(data.message.content)
  ) {

    const pieces = [];

    for (
      let i = 0;
      i < data.message.content.length;
      i++
    ) {

      const part =
        data.message.content[i];

      if (
        part &&
        typeof part.text === "string"
      ) {
        pieces.push(part.text);
      }
    }

    if (pieces.length) {
      return pieces.join("\n").trim();
    }
  }

  return "";
}


/* ---------------------------------------------------------
   API handler
   --------------------------------------------------------- */

module.exports = async function (req, res) {

  /*
   * POST only
   */

  if (req.method !== "POST") {

    return res.status(405).json({
      ok: false,
      error: "POST only."
    });

  }


  /*
   * Server-side API key
   */

  const apiKey =
    process.env.AI_API_KEY;

  if (!apiKey) {

    return res.status(200).json({

      ok: false,

      diagnostic: true,

      text:
        "RightAware AI connection diagnostic:\n\n" +
        "AI_API_KEY is not available to this Production deployment.\n\n" +
        "Please check the Vercel Production environment variable.",

      disclaimer: DISCLAIMER

    });

  }


  /*
   * Read request body
   */

  let body =
    req.body;

  if (
    typeof body === "string"
  ) {

    try {

      body =
        JSON.parse(body);

    } catch (error) {

      return res.status(400).json({

        ok: false,

        error:
          "Invalid JSON request."

      });

    }

  }


  body =
    body || {};


  /*
   * User message
   */

  const message =
    typeof body.message === "string"
      ? body.message.trim()
      : "";


  if (!message) {

    return res.status(400).json({

      ok: false,

      error:
        "Please provide a message."

    });

  }


  if (
    message.length > 2000
  ) {

    return res.status(400).json({

      ok: false,

      error:
        "Message is too long."

    });

  }


  /*
   * Optional page context
   */

  const pageContext =
    typeof body.context === "string" &&
    body.context.trim()
      ? "\n\nRIGHTAWARE PAGE CONTEXT:\n" +
        body.context.slice(0, 3000)
      : "";


  /*
   * Send request to OpenAI
   */

  try {

    const response =
      await fetch(API_URL, {

        method: "POST",

        headers: {

          "Content-Type":
            "application/json",

          "Authorization":
            "Bearer " + apiKey

        },

        body: JSON.stringify({

          model: MODEL,

          instructions:
            SYSTEM,

          input:
            message +
            pageContext,

          max_output_tokens:
            900

        })

      });


    /*
     * Read provider response
     */

    const providerText =
      await response.text();


    let providerData =
      null;


    try {

      providerData =
        JSON.parse(
          providerText
        );

    } catch (error) {

      providerData =
        null;

    }


    /*
     * OpenAI error
     */

    if (!response.ok) {

      const providerMessage =

        providerData &&
        providerData.error &&
        providerData.error.message

          ? String(
              providerData.error.message
            )

          : providerData &&
            providerData.message

          ? String(
              providerData.message
            )

          : providerText

          ? providerText.slice(
              0,
              500
            )

          : "No provider error message.";


      console.error(
        "RIGHTAWARE_OPENAI_ERROR",
        response.status,
        providerMessage
      );


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
     * Extract actual generated answer
     */

    const answer =
      extractResponseText(
        providerData
      );


    /*
     * No text found
     */

    if (!answer) {

      console.error(
        "RIGHTAWARE_OPENAI_UNREADABLE_RESPONSE",
        JSON.stringify(
          providerData
        ).slice(0, 5000)
      );


      return res.status(200).json({

        ok: false,

        diagnostic: true,

        text:
          "RightAware AI connection diagnostic:\n\n" +
          "OpenAI accepted the request, but RightAware could not extract the generated answer from the response.",

        disclaimer:
          "Temporary technical diagnostic."

      });

    }


    /*
     * SUCCESS
     */

    return res.status(200).json({

      ok: true,

      text:
        answer,

      links: [],

      sources: [],

      disclaimer:
        DISCLAIMER,

      model:
        MODEL

    });

  }


  /*
   * Network / server error
   */

  catch (error) {

    console.error(
      "RIGHTAWARE_AI_ERROR",
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