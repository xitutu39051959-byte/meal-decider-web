import { RecommendationWorkspace } from "@/features/recommendation/components/recommendation-workspace";

interface RecommendPageProps {
  searchParams?: Promise<{
    intent?: string;
  }>;
}

export default async function RecommendPage({ searchParams }: RecommendPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const intentValue = params?.intent;
  const intent =
    intentValue === "lunch" || intentValue === "dinner" || intentValue === "random"
      ? intentValue
      : null;

  return <RecommendationWorkspace intent={intent} />;
}
