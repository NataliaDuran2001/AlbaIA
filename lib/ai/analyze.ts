import "server-only"
import type { BusinessProfileInput, Roadmap, RoadmapStep } from "@/lib/types"

/**
 * analyzeBusiness — the single AI entry point.
 *
 * v0 uses deterministic mock logic, but the signature is production-real:
 * swap the body for an LLM call that returns the same typed `Roadmap`.
 */
export async function analyzeBusiness(description: string, profile: BusinessProfileInput): Promise<Roadmap> {
  // Simulate model latency so loading screens resolve on a real promise.
  await new Promise((r) => setTimeout(r, 1200))

  const recommendedStructure = recommendStructure(profile)
  const rationale = buildRationale(description, profile, recommendedStructure)
  const steps = buildSteps(profile)

  return { recommendedStructure, rationale, steps }
}

function recommendStructure(profile: BusinessProfileInput): string {
  if (profile.size === "solo") return "Sole Proprietor"
  if (profile.size === "small") return "Limited Liability Company (Sociedad de Responsabilidad Limitada)"
  return "Stock Corporation (Sociedad Anónima)"
}

function buildRationale(description: string, profile: BusinessProfileInput, structure: string): string {
  const snippet = description.trim().slice(0, 80)
  return `Based on your ${profile.size === "solo" ? "single-owner" : "multi-owner"} ${
    profile.industry
  } business${snippet ? ` ("${snippet}${description.length > 80 ? "…" : ""}")` : ""} operating in ${
    profile.city || "Guatemala"
  }, a ${structure} offers the best balance of liability protection, tax simplicity, and registration cost.`
}

function buildSteps(profile: BusinessProfileInput): RoadmapStep[] {
  const base: RoadmapStep[] = [
    {
      key: "identity_verification",
      label: "Verify your identity",
      description: "Confirm your DPI (national ID) to begin the formalization process.",
      status: "pending",
      premium: false,
    },
    {
      key: "address_confirmation",
      label: "Confirm business address",
      description: "Provide and verify the physical address where your business will operate.",
      status: "pending",
      premium: false,
    },
    {
      key: "nit_registration",
      label: "Register your NIT",
      description: "Obtain your tax identification number (NIT) from SAT.",
      status: "pending",
      premium: true,
    },
    {
      key: "sat_enrollment",
      label: "Enroll with SAT",
      description: "Register as a taxpayer and select your tax regime.",
      status: "pending",
      premium: true,
    },
  ]

  if (profile.size !== "solo") {
    base.push({
      key: "deed_incorporation",
      label: "Draft incorporation deed",
      description: "Prepare the notarized deed of incorporation with a lawyer.",
      status: "pending",
      premium: true,
    })
    base.push({
      key: "commercial_registry",
      label: "Register with the Commercial Registry",
      description: "File your company with the Registro Mercantil.",
      status: "pending",
      premium: true,
    })
  }

  if (profile.industry === "food") {
    base.push({
      key: "sanitary_license",
      label: "Obtain sanitary license",
      description: "Apply for the health/sanitary permit required for food businesses.",
      status: "pending",
      premium: true,
    })
  }

  return base
}
