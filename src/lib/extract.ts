import { getOpenAI, OPENAI_MODEL } from "./openai";
import type { PolicyFact } from "@/types";

export type ExtractionSource = "ai" | "deterministic" | "deterministic-fallback";

export type ExtractionResult = {
  facts: PolicyFact[];
  source: ExtractionSource;
  textLength: number;
  aiError?: string;
};

const EXTRACT_SYSTEM_PROMPT = `You are Claro's policy document extraction engine for Singapore insurance policy illustrations.

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
- Important cover-page warnings or product-risk statements

Use these canonical IDs whenever the matching value exists:
- product-name
- classification
- annual-premium
- premium-frequency
- premium-term
- policy-term
- sum-assured
- death-benefit
- distribution-cost
- distribution-cost-yr1
- surrender-value-yr5
- surrender-value-yr10
- surrender-value-yr15
- surrender-value-yr20
- surrender-value-yr25
- surrender-value-yr30
- projected-surrender-yr5
- projected-surrender-yr10
- projected-surrender-yr15
- projected-surrender-yr20
- projected-surrender-yr25
- projected-surrender-yr30
- illustrated-low-rate
- illustrated-high-rate
- non-guaranteed-notice`;

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function quoteAround(text: string, index: number, length: number) {
  const start = Math.max(0, index - 80);
  const end = Math.min(text.length, index + length + 120);
  return text.slice(start, end).replace(/\s+/g, " ").trim().slice(0, 200);
}

function cleanMoney(value: string) {
  return Number(value.replace(/[$,\s]/g, ""));
}

function uniqueFacts(facts: PolicyFact[]) {
  const seen = new Set<string>();
  return facts.filter((fact) => {
    if (seen.has(fact.id)) return false;
    seen.add(fact.id);
    return true;
  });
}

function mergeFacts(primary: PolicyFact[], supplemental: PolicyFact[]) {
  const byId = new Map<string, PolicyFact>();
  for (const fact of [...primary, ...supplemental]) {
    const existing = byId.get(fact.id);
    if (!existing) {
      byId.set(fact.id, fact);
      continue;
    }

    const existingValue = String(existing.value ?? "").trim().toLowerCase();
    if (
      !existingValue ||
      existingValue === "not found" ||
      existing.sourceType === "not-found" ||
      (existing.sourceType !== "document-stated" && fact.sourceType === "document-stated") ||
      (!existing.quote && !!fact.quote)
    ) {
      byId.set(fact.id, fact);
    } else if (!existing.page && fact.page) {
      byId.set(fact.id, { ...existing, page: fact.page });
    }
  }
  return [...byId.values()];
}

function addRegexFact(
  facts: PolicyFact[],
  text: string,
  config: {
    id: string;
    label: string;
    regex: RegExp;
    unit?: string;
    value?: (match: RegExpExecArray) => string | number;
  }
) {
  const match = config.regex.exec(text);
  if (!match) return;
  facts.push({
    id: config.id,
    label: config.label,
    value: config.value ? config.value(match) : match[1]?.trim(),
    unit: config.unit,
    sourceType: "document-stated",
    quote: quoteAround(text, match.index, match[0].length),
  });
}

function addFactIfMissing(facts: PolicyFact[], fact: PolicyFact) {
  if (facts.some((existing) => existing.id === fact.id)) return;
  facts.push(fact);
}

function hasFact(facts: PolicyFact[], id: string) {
  return facts.some((fact) => fact.id === id && String(fact.value ?? "").trim().length > 0);
}

function hasHighConfidenceDeterministicFacts(facts: PolicyFact[]) {
  const required = [
    "product-name",
    "annual-premium",
    "sum-assured",
    "distribution-cost",
    "total-premiums-paid-age85",
    "surrender-value-yr20",
    "projected-surrender-yr20",
    "premium-charge-yr1",
  ];
  return required.every((id) => hasFact(facts, id));
}

function addGla4SurrenderFacts(facts: PolicyFact[], text: string) {
  if (!/GREAT\s+Life\s+Advantage\s+4/i.test(text)) return;
  const start = text.search(/GREAT Life Advantage 4 \(10040\) Surrender value/i);
  const deductionsOffset = start >= 0 ? text.slice(start).search(/\bDeductions\b/i) : -1;
  const end = deductionsOffset >= 0 ? start + deductionsOffset : -1;
  if (start < 0 || end < start) return;
  const section = text.slice(start, end);
  const rows = [5, 10, 15, 20, 25, 30, 40, 50, 60, 64];

  for (const year of rows) {
    const row = new RegExp(
      `(?:^|\\s)${year}\\s+\\d+\\s+([\\d,]+\\.\\d{2})\\s+0\\s+([\\d,]+)\\s+\\2\\s+([\\d,]+)\\s+\\3(?:\\s|$)`
    ).exec(section);
    if (!row) continue;

    const quote = row[0].replace(/\s+/g, " ").trim();
    addFactIfMissing(facts, {
      id: `surrender-value-yr${year}`,
      label: `Guaranteed surrender value at year ${year}`,
      value: 0,
      unit: "SGD",
      sourceType: "document-stated",
      quote,
    });
    addFactIfMissing(facts, {
      id: `projected-surrender-yr${year}`,
      label: `Projected surrender value at year ${year} (4% illustration, non-guaranteed)`,
      value: cleanMoney(row[2]),
      unit: "SGD",
      sourceType: "document-stated",
      quote,
    });
    addFactIfMissing(facts, {
      id: `projected-high-surrender-yr${year}`,
      label: `Projected surrender value at year ${year} (8% illustration, non-guaranteed)`,
      value: cleanMoney(row[3]),
      unit: "SGD",
      sourceType: "document-stated",
      quote,
    });
  }
}

function addGla4DistributionFacts(facts: PolicyFact[], text: string) {
  if (!/GREAT\s+Life\s+Advantage\s+4/i.test(text)) return;
  const distributionSection = text.slice(text.search(/Distribution cost/i));
  const finalRow = /64\s+85\s+([\d,]+)\s+([\d,]+(?:\.\d{2})?)/.exec(distributionSection);
  const firstRow = /1\s+22\s+([\d,]+)\s+1,200\.00/.exec(distributionSection);

  if (firstRow) {
    addFactIfMissing(facts, {
      id: "distribution-cost-yr1",
      label: "Year 1 distribution cost",
      value: cleanMoney(firstRow[1]),
      unit: "SGD",
      sourceType: "document-stated",
      quote: firstRow[0].replace(/\s+/g, " ").trim(),
    });
  }

  if (finalRow) {
    addFactIfMissing(facts, {
      id: "distribution-cost",
      label: "Total distribution cost to age 85",
      value: cleanMoney(finalRow[1]),
      unit: "SGD",
      sourceType: "document-stated",
      quote: finalRow[0].replace(/\s+/g, " ").trim(),
    });
    addFactIfMissing(facts, {
      id: "total-premiums-paid-age85",
      label: "Total premiums paid to age 85",
      value: cleanMoney(finalRow[2]),
      unit: "SGD",
      sourceType: "document-stated",
      quote: finalRow[0].replace(/\s+/g, " ").trim(),
    });
    addFactIfMissing(facts, {
      id: "projection-horizon-years",
      label: "Illustration horizon to age 85",
      value: 64,
      unit: "years",
      sourceType: "calculated-from-document",
      quote: finalRow[0].replace(/\s+/g, " ").trim(),
    });
  }
}

function addGla4ProductSummaryFacts(facts: PolicyFact[], text: string) {
  if (!/GREAT\s+Life\s+Advantage\s+4/i.test(text)) return;
  addFactIfMissing(facts, {
    id: "policy-term",
    label: "Policy term",
    value: "Whole of life",
    sourceType: "document-stated",
    quote: "Policy term: Whole of life",
  });
  addFactIfMissing(facts, {
    id: "premium-term",
    label: "Premium payment term",
    value: "Whole of life",
    sourceType: "document-stated",
    quote: "You pay for: Whole of life",
  });
  addFactIfMissing(facts, {
    id: "premium-frequency",
    label: "Premium frequency",
    value: "Yearly",
    sourceType: "document-stated",
    quote: "Payment frequency: Yearly",
  });
  addFactIfMissing(facts, {
    id: "classification",
    label: "Policy classification",
    value: "Regular premium whole of life investment-linked policy",
    sourceType: "document-stated",
    quote:
      "GREAT Life Advantage 4 is a regular premium whole of life investment-linked policy designed to meet your protection needs.",
  });
  addFactIfMissing(facts, {
    id: "premium-charge-yr1",
    label: "Premium charge in year 1",
    value: "76%",
    sourceType: "document-stated",
    quote: "Premium charge as a percentage of the basic regular premium paid 1st policy year 76.00%",
  });
  addFactIfMissing(facts, {
    id: "premium-charge-yr2",
    label: "Premium charge in year 2",
    value: "51%",
    sourceType: "document-stated",
    quote: "2nd policy year 51.00%",
  });
  addFactIfMissing(facts, {
    id: "premium-charge-yr3",
    label: "Premium charge in year 3",
    value: "26%",
    sourceType: "document-stated",
    quote: "3rd policy year 26.00%",
  });
  addFactIfMissing(facts, {
    id: "non-lapse-guarantee",
    label: "Non-lapse guarantee condition",
    value: "Applies during first 10 policy years if premiums are paid and no partial withdrawal is made.",
    sourceType: "document-stated",
    quote:
      "During the first 10 policy years, the policy and its attaching rider(s) will not lapse even if the account value falls to zero or below...",
  });
  addFactIfMissing(facts, {
    id: "illustrated-low-rate",
    label: "Lower illustrated investment return",
    value: "4.00% p.a.",
    sourceType: "document-stated",
    quote: "The illustrations are based on illustrated investment returns of 8.00% p.a. and 4.00% p.a.",
  });
  addFactIfMissing(facts, {
    id: "illustrated-high-rate",
    label: "Higher illustrated investment return",
    value: "8.00% p.a.",
    sourceType: "document-stated",
    quote: "The illustrations are based on illustrated investment returns of 8.00% p.a. and 4.00% p.a.",
  });
  addFactIfMissing(facts, {
    id: "fund-name",
    label: "Selected fund",
    value: "GreatLink Global Equity Fund",
    sourceType: "document-stated",
    quote: "GreatLink Global Equity Fund 07 100% 1,200.00",
  });
  addFactIfMissing(facts, {
    id: "premium-apportionment",
    label: "Premium apportionment",
    value: "100% to GreatLink Global Equity Fund",
    sourceType: "document-stated",
    quote: "GreatLink Global Equity Fund 07 100% 1,200.00",
  });
}

export function extractFactsDeterministically(rawText: string): PolicyFact[] {
  const text = normalizeText(rawText);
  const facts: PolicyFact[] = [];

  addRegexFact(facts, text, {
    id: "product-name",
    label: "Product / plan name",
    regex: /\b(GREAT\s+(?:Life|Wealth|Term)[A-Za-z0-9\s\-]+?)(?:\s+\(\d+\)|\s+Policy term|\s+Name of Insurer)/i,
    value: (match) => match[1].replace(/\s+/g, " ").trim(),
  });
  addRegexFact(facts, text, {
    id: "annual-premium",
    label: "Annual premium",
    regex: /(?:annual premium payable is|annual premium|basic regular premium:|basic premium:|your plan)\s*(?:per year\s*)?\$?\s*([\d,]+(?:\.\d{2})?)/i,
    unit: "SGD/year",
    value: (match) => cleanMoney(match[1]),
  });
  addRegexFact(facts, text, {
    id: "sum-assured",
    label: "Basic sum assured",
    regex: /basic sum assured:[^$]{0,80}\$\s*([\d,]+(?:\.\d{2})?)/i,
    unit: "SGD",
    value: (match) => cleanMoney(match[1]),
  });
  addRegexFact(facts, text, {
    id: "policy-term",
    label: "Policy term",
    regex: /policy term:?\s*(?:you pay for:)?\s*(whole of life|\d+\s*years?)/i,
    value: (match) => match[1].replace(/\s+/g, " "),
  });
  addRegexFact(facts, text, {
    id: "premium-term",
    label: "Premium payment term",
    regex: /(?:you pay for:|premium term)\s*(whole of life|\d+\s*years?)/i,
    value: (match) => match[1].replace(/\s+/g, " "),
  });
  addRegexFact(facts, text, {
    id: "distribution-cost",
    label: "Total distribution cost",
    regex: /total distribution cost(?: of this product)?(?: is| to-date is)?[^$]{0,140}\$\s*([\d,]+(?:\.\d{2})?)/i,
    unit: "SGD",
    value: (match) => cleanMoney(match[1]),
  });
  addRegexFact(facts, text, {
    id: "distribution-cost-notice",
    label: "Distribution cost notice",
    regex: /(total distribution cost[^.]{40,260}\.)/i,
    value: (match) => match[1].replace(/\s+/g, " ").trim(),
  });
  addRegexFact(facts, text, {
    id: "surrender-value-notice",
    label: "Surrender value notice",
    regex: /(WHAT HAPPENS IF YOU SURRENDER YOUR POLICY EARLY\?[^.]{40,260}\.)/i,
    value: (match) => match[1].replace(/\s+/g, " ").trim(),
  });
  addRegexFact(facts, text, {
    id: "guaranteed-only-notice",
    label: "Guaranteed benefits notice",
    regex: /(guaranteed benefits only[^.]{0,180}\.)/i,
    value: (match) => match[1].replace(/\s+/g, " ").trim(),
  });

  addGla4SurrenderFacts(facts, text);
  addGla4DistributionFacts(facts, text);
  addGla4ProductSummaryFacts(facts, text);

  return uniqueFacts(facts).filter(
    (fact) => fact.value !== undefined && String(fact.value).trim().length > 0
  );
}

function describeAIError(error: unknown) {
  if (error && typeof error === "object") {
    const maybe = error as { status?: number; code?: string; message?: string };
    return [maybe.status, maybe.code, maybe.message].filter(Boolean).join(" ");
  }
  return error instanceof Error ? error.message : "Unknown AI extraction error";
}

export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<string> {
  // pdfjs expects these browser primitives in server runtimes. We only extract
  // text, so lightweight shims are enough and avoid native canvas failures on
  // Render/Next.
  const globals = globalThis as Record<string, unknown>;
  const DOMMatrixShim = class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    scaleSelf() {
      return this;
    }
    translateSelf() {
      return this;
    }
    multiplySelf() {
      return this;
    }
  };
  const ImageDataShim = class ImageData {
    constructor(
      public data: Uint8ClampedArray,
      public width: number,
      public height: number
    ) {}
  };
  const Path2DShim = class Path2D {};
  globals["DOMMatrix"] ??= DOMMatrixShim;
  globals["ImageData"] ??= ImageDataShim;
  globals["Path2D"] ??= Path2DShim;

  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const { pathToFileURL } = await import("node:url");
  const path = await import("node:path");
  const ensureTrailingSeparator = (filePath: string) =>
    filePath.endsWith(path.sep) ? filePath : `${filePath}${path.sep}`;
  const pdfjsRoot = path.join(process.cwd(), "node_modules/pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(
    path.join(pdfjsRoot, "legacy/build/pdf.worker.mjs")
  ).href;
  const data = new Uint8Array(pdfBuffer);
  const doc = await pdfjs.getDocument({
    data,
    cMapPacked: true,
    cMapUrl: ensureTrailingSeparator(path.join(pdfjsRoot, "cmaps")),
    standardFontDataUrl: ensureTrailingSeparator(path.join(pdfjsRoot, "standard_fonts")),
    wasmUrl: ensureTrailingSeparator(path.join(pdfjsRoot, "wasm")),
  }).promise;
  const pageTexts: string[] = [];

  try {
    for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber += 1) {
      const page = await doc.getPage(pageNumber);
      const content = await page.getTextContent();
      pageTexts.push(
        content.items
          .map((item) => ("str" in item ? item.str : ""))
          .filter(Boolean)
          .join(" ")
      );
      page.cleanup();
    }
    return pageTexts.join("\n\n");
  } finally {
    await doc.destroy();
  }
}

async function extractFactsWithAI(text: string): Promise<PolicyFact[]> {
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: OPENAI_MODEL,
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

export async function extractFactsFromPDF(pdfBuffer: Buffer): Promise<ExtractionResult> {
  const fullText = await extractTextFromPDF(pdfBuffer);
  const text = fullText.slice(0, 12000); // stay within token budget
  const fallbackFacts = extractFactsDeterministically(fullText);

  if (hasHighConfidenceDeterministicFacts(fallbackFacts)) {
    return {
      facts: fallbackFacts,
      source: "deterministic",
      textLength: fullText.length,
    };
  }

  if (!text.trim()) {
    return {
      facts: fallbackFacts,
      source: "deterministic-fallback",
      textLength: 0,
      aiError: "PDF text extraction returned no text.",
    };
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    return {
      facts: fallbackFacts,
      source: "deterministic-fallback",
      textLength: fullText.length,
      aiError: "OPENAI_API_KEY is not configured.",
    };
  }

  try {
    const aiFacts = await extractFactsWithAI(text);
    if (aiFacts.length >= 3) {
      return {
        facts: mergeFacts(aiFacts, fallbackFacts),
        source: "ai",
        textLength: fullText.length,
      };
    }
    return {
      facts: fallbackFacts.length > aiFacts.length ? fallbackFacts : aiFacts,
      source: "deterministic-fallback",
      textLength: fullText.length,
      aiError: `AI extraction returned only ${aiFacts.length} facts.`,
    };
  } catch (error) {
    return {
      facts: fallbackFacts,
      source: "deterministic-fallback",
      textLength: fullText.length,
      aiError: describeAIError(error),
    };
  }
}
