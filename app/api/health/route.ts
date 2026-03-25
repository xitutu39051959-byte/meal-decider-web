export async function GET() {
  return Response.json({
    ok: true,
    service: "meal-decider-web",
    date: new Date().toISOString(),
  });
}

