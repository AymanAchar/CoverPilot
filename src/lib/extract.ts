import { openai } from "./openai";
import type { PolicyFact } from "@/types";

const EXTRACT_SYSTEM_PROMPT = `You are CoverPilot's policy document extraction engine for Singapore insurance policy illustrations.

Your job is to read raw text from a policy illustration and extract structured facts.

Rules you must follow:
- Only extract facts that are explicitly stated in the document text. Do not infer or guess.
- If a value is not present in the text, do not include it.
- For non-guaranteed values, always note they are non-guaranteed in the label or value.
- Never make recommendations or judgements about the policy.
- Do not extract names, policy numbers, NRIC/passport numbers, phone numbers, addresses, adviser names, dates of birth, or other personal identifiers.
- Prefer policy/product facts from the Cover Page, Product Summary, Policy Illustration, Plan Summary, table of values, and charges/distribution-cost sections.

Return a JSON object with a single "facts" array. Each fact must match this shape:
{
  "id": string (kebab-case, unique, e.g. "annual-premium"),
  "label": string (human-readable label),
  "value": string or number,
  "unit": string or null (e.g. "SGD", "years", "SGD/year"),
  "sourceType": "document-stated" | "calculated-from-document" | "not-found",
  "page": number or null,
  "quote": string (exact quote from the document that supports this fact, max 200 chars)
}

Extract these facts if present:
- Product / plan name
- Participating / non-participating / investment-linked / term / whole life / endowment classification
- Plan and rider rows from the plan summary
- Annual premium (and frequency)
- Premium frequency
- Premium payment term
- Policy term
- Coverage amount / sum assured for each main plan or rider
- Sum assured / death benefit
- Total Distribution Cost over the policy if stated — this is the LIA-disclosed figure and should be captured whenever present
- Distribution cost by year if the table provides yearly values
- Guaranteed surrender values by year (5, 10, 15, 20 if available)
- Projected (non-guaranteed) surrender values
- Cash value / maturity value / protection value tables
- Guaranteed vs non-guaranteed breakdown notice
- Illustrated investment rate of return, if stated
- Charges or fees, including policy fees, management fees, insurance charges, surrender charges, or fund charges
- Any key exclusions or waiting periods
- Important cover-page warnings or product-risk statements`;

export async function extractFactsFromPDF(pdfBuffer: Buffer): Promise<PolicyFact[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PDFParse } = require("pdf-parse") as typeof import("pdf-parse");
  const parser = new PDFParse({ data: pdfBuffer });
  const parsed = await parser.getText();
  await parser.destroy();
  const text = parsed.text.slice(0, 12000); // stay within token budget

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: EXTRACT_SYSTEM_PROMPT },
      {
        role: "user",
        content: `Extract structured facts from this Singapore insurance policy document text:\n\n${text}`,
      },
    ],
    temperature: 0,
  });

  const raw = JSON.parse(response.choices[0].message.content ?? "{}");
  return (raw.facts ?? []) as PolicyFact[];
}
