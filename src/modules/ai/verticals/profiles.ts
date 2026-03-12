import type { VerticalProfile } from "../ai.types"

export const VERTICAL_PROFILES: Record<string, VerticalProfile> = {
  bng_brokerage: {
    slug: "bng_brokerage",
    name: "BNG Credit Brokerage",
    description: "Biodiversity Net Gain credit trading and ecological services",
    terminology: {
      booking: "site assessment",
      customer: "landowner or developer",
      staff: "ecologist or compliance officer",
      service: "ecological survey or habitat assessment",
      payment: "credit transaction",
      invoice: "credit purchase invoice",
    },
    systemPromptAddendum: `You are assisting a BNG (Biodiversity Net Gain) credit brokerage. Key concepts:
- Sites produce biodiversity units (BDUs). Each has location, area, habitat type, and NE registration status.
- Deals match landowners (supply) with developers (demand) for biodiversity units.
- Compliance includes NE registration, HMMP plans, and S106 agreements.
- Catchments constrain which sites serve which developers.
When users say "booking", they mean "site assessment". "Customer" means "landowner" or "developer".`,
  },
  dental_practice: {
    slug: "dental_practice",
    name: "Dental Practice",
    description: "Dental clinic appointment and patient management",
    terminology: {
      booking: "appointment",
      customer: "patient",
      staff: "dentist or hygienist",
      service: "dental procedure",
    },
    systemPromptAddendum: `You are assisting a dental practice. Bookings are "appointments", customers are "patients", staff are "dentists" or "hygienists". Be mindful of patient confidentiality.`,
  },
  fitness_studio: {
    slug: "fitness_studio",
    name: "Fitness Studio",
    description: "Fitness class scheduling and member management",
    terminology: {
      booking: "class booking",
      customer: "member",
      staff: "trainer or instructor",
      service: "class or session",
    },
    systemPromptAddendum: `You are assisting a fitness studio. Bookings are "class bookings", customers are "members", staff are "trainers" or "instructors".`,
  },
  consulting_firm: {
    slug: "consulting_firm",
    name: "Consulting Firm",
    description: "Professional services engagement and project management",
    terminology: {
      booking: "engagement session",
      customer: "client",
      staff: "consultant or analyst",
      service: "advisory session",
    },
    systemPromptAddendum: `You are assisting a consulting firm. Bookings are "engagement sessions", customers are "clients", staff are "consultants".`,
  },
  beauty_salon: {
    slug: "beauty_salon",
    name: "Beauty Salon",
    description: "Beauty and wellness appointment management",
    terminology: {
      booking: "appointment",
      customer: "client",
      staff: "stylist or therapist",
      service: "treatment",
    },
    systemPromptAddendum: `You are assisting a beauty salon. Bookings are "appointments", customers are "clients", staff are "stylists" or "therapists".`,
  },
  generic: {
    slug: "generic",
    name: "Generic Business",
    description: "General multi-tenant business platform",
    terminology: {},
    systemPromptAddendum: "",
  },
}
