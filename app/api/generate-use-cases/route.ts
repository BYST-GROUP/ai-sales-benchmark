import { NextRequest, NextResponse } from "next/server";

interface GenerateUseCasesPayload {
  email: string;
  company_name: string;
  total_score: number;
  pillar_1_score: number;
  pillar_2_score: number;
  pillar_3_score: number;
  industry?: string;
  estimated_acv?: string;
  estimated_aes?: string;
}

export async function POST(request: NextRequest) {
  const apiUrl = process.env.USE_CASES_API_URL;
  const apiKey = process.env.USE_CASES_API_KEY;

  if (!apiUrl || !apiKey) {
    console.error("[generate-use-cases] Missing USE_CASES_API_URL or USE_CASES_API_KEY");
    return NextResponse.json(
      { error: "Use-cases service not configured" },
      { status: 500 }
    );
  }

  let body: GenerateUseCasesPayload;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { email, company_name, total_score, pillar_1_score, pillar_2_score, pillar_3_score } = body;

  if (!email || !company_name || total_score == null || pillar_1_score == null || pillar_2_score == null || pillar_3_score == null) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`${apiUrl}/api/results`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        email: body.email,
        company_name: body.company_name,
        total_score: body.total_score,
        pillar_1_score: body.pillar_1_score,
        pillar_2_score: body.pillar_2_score,
        pillar_3_score: body.pillar_3_score,
        industry: body.industry,
        estimated_acv: body.estimated_acv,
        estimated_aes: body.estimated_aes,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("[generate-use-cases] Upstream error:", res.status, err);
      return NextResponse.json(
        { error: "Failed to generate use cases" },
        { status: 502 }
      );
    }

    const data = await res.json();
    return NextResponse.json({ url: data.url });
  } catch (err) {
    console.error("[generate-use-cases] Fetch error:", err);
    return NextResponse.json(
      { error: "Failed to reach use-cases service" },
      { status: 502 }
    );
  }
}
