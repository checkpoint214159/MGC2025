import { QueryBaseline } from "@/lib/user/baseline";

/**
 * Default QueryBaseline template for colostomy patients.
 * This is used during development/testing to avoid LLM calls.
 * Real structure must match QueryBaselineSchema.
 */
export const COLOSTOMY_QUERY_BASELINE: QueryBaseline = {
  axes: {
    biomechanical: {
      axisType: "A",
      entries: [
        {
          code: "s540",
          domain: "Abdominal Wall & Associated Structures",
          indicator: "Surgical Site Integrity",
          unit: "1-10 scale",
          range: 10,
          justification: "Critical for assessing post-operative wound healing and complications (infection, dehiscence).",
          question: {
            questionText: "On a scale of 1-10, how would you rate the integrity and comfort of your surgical site right now? (1=severe pain/breakdown, 10=fully healed)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
        {
          code: "b525",
          domain: "Defecation Functions",
          indicator: "Stoma Output & Consistency",
          unit: "1-10 scale",
          range: 10,
          justification: "Essential for managing colostomy output patterns and predicting daily care burden.",
          question: {
            questionText: "How predictable and manageable has your stoma output been? (1=very unpredictable/problematic, 10=perfectly normal)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
        {
          code: "b280",
          domain: "Pain",
          indicator: "Post-Operative Pain Level",
          unit: "1-10 scale",
          range: 10,
          justification: "Pain limiting patient mobility and functional recovery.",
          question: {
            questionText: "How much pain are you experiencing around the surgical area? (1=severe, 10=no pain)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
      ],
      summary: "Biomechanical status: Pre-operative baseline for surgical site integrity, stoma function, and pain management. All metrics at optimal pre-op levels.",
    },
    functional: {
      axisType: "B",
      entries: [
        {
          code: "d450",
          domain: "Walking",
          indicator: "Ambulation Distance & Assistive Devices",
          unit: "meters",
          range: 1000,
          justification: "Core indicator of functional independence post-surgery; predicts discharge readiness.",
          question: {
            questionText: "How far can you walk comfortably right now with or without assistance? (in meters or 'a few steps' / 'around the room' / 'down the hallway')",
            inputType: "text",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 1000,
            },
          },
        },
        {
          code: "d530",
          domain: "Toileting",
          indicator: "Independence in Toilet/Stoma Care",
          unit: "1-10 scale",
          range: 10,
          justification: "Critical for patient dignity, independence, and infection prevention.",
          question: {
            questionText: "How independent are you with toileting and stoma care? (1=completely dependent, 10=fully independent)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
        {
          code: "d540",
          domain: "Dressing",
          indicator: "Self-Care Ability",
          unit: "1-10 scale",
          range: 10,
          justification: "Indicator of upper extremity function and overall ADL independence.",
          question: {
            questionText: "How independently can you dress and groom yourself? (1=needs full assistance, 10=fully independent)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
      ],
      summary: "Functional capacity: Pre-operative baseline for mobility, self-care independence, and toileting. All indicators reflect expected pre-op functional reserve.",
    },
    systemic: {
      axisType: "C",
      entries: [
        {
          code: "b410",
          domain: "Cardiovascular Functions",
          indicator: "Exercise Tolerance",
          unit: "1-10 scale",
          range: 10,
          justification: "Predicts cardiac stress response during recovery and exercise progression.",
          question: {
            questionText: "What is your current exercise tolerance level? (1=very winded with minimal activity, 10=can do vigorous activity)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
        {
          code: "b510",
          domain: "Ingestion Functions",
          indicator: "Dietary Intake & Tolerance",
          unit: "1-10 scale",
          range: 10,
          justification: "Nutritional status critical for wound healing and systemic recovery.",
          question: {
            questionText: "How well are you tolerating food and liquids? (1=unable to eat/drink, 10=normal appetite and tolerance)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
        {
          code: "b620",
          domain: "Urinary Functions",
          indicator: "Continence & Urinary Output",
          unit: "1-10 scale",
          range: 10,
          justification: "Early indicator of systemic recovery and hydration status.",
          question: {
            questionText: "Are you experiencing any urinary concerns (urgency, leakage, difficulty)? (1=severe problems, 10=no concerns)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
      ],
      summary: "Systemic homeostasis: Pre-operative baseline for cardiovascular, digestive, and genitourinary function. All systems in normal homeostatic state.",
    },
  },
};

/**
 * Template for ACL Reconstruction patients
 */
export const ACL_QUERY_BASELINE: QueryBaseline = {
  axes: {
    biomechanical: {
      axisType: "A",
      entries: [
        {
          code: "s730",
          domain: "Structure of Lower Extremity",
          indicator: "Knee Joint Integrity & Swelling",
          unit: "1-10 scale",
          range: 10,
          justification: "Core indicator for surgical site healing and graft integration.",
          question: {
            questionText: "How would you rate your knee joint stability and swelling today? (1=severe swelling/instability, 10=normal knee)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
        {
          code: "b280",
          domain: "Pain",
          indicator: "Localized Knee Pain",
          unit: "1-10 scale",
          range: 10,
          justification: "Critical for rehabilitation tolerance and progression timing.",
          question: {
            questionText: "Rate your knee pain intensity. (1=severe pain, 10=no pain)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
        {
          code: "b770",
          domain: "Gait Functions",
          indicator: "Gait Pattern & Weight-Bearing",
          unit: "1-10 scale",
          range: 10,
          justification: "Determines rehabilitation stage and return-to-activity timeline.",
          question: {
            questionText: "How normal is your walking pattern? Can you put weight on the leg? (1=cannot walk, 10=normal gait)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
      ],
      summary: "Biomechanical: Pre-operative baseline for ACL-repaired knee joint. Expected full integrity pre-op with normal ROM and stability.",
    },
    functional: {
      axisType: "B",
      entries: [
        {
          code: "d450",
          domain: "Walking",
          indicator: "Walking Speed & Distance",
          unit: "meters",
          range: 5000,
          justification: "Primary functional outcome for orthopedic recovery.",
          question: {
            questionText: "How far can you walk without stopping? Estimate in meters or describe (e.g., 'a lap around my house').",
            inputType: "text",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 5000,
            },
          },
        },
        {
          code: "d455",
          domain: "Moving Around",
          indicator: "Stairs & Inclines",
          unit: "1-10 scale",
          range: 10,
          justification: "Functional marker for multi-directional mobility.",
          question: {
            questionText: "How comfortably can you climb stairs? (1=cannot climb, 10=no difficulty)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
        {
          code: "d760",
          domain: "Family Relationships",
          indicator: "Sports/Recreation Participation",
          unit: "1-10 scale",
          range: 10,
          justification: "Assesses pre-injury activity level and rehabilitation goals.",
          question: {
            questionText: "What sports or recreational activities were you doing before surgery? Rate your typical frequency (1=not active, 10=very active).",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
      ],
      summary: "Functional capacity: Pre-operative baseline for mobility, stair climbing, and recreational activity. Full pre-injury function expected.",
    },
    systemic: {
      axisType: "C",
      entries: [
        {
          code: "b410",
          domain: "Cardiovascular Functions",
          indicator: "Cardiovascular Fitness",
          unit: "1-10 scale",
          range: 10,
          justification: "Baseline cardiovascular capacity for rehabilitation exercise tolerance.",
          question: {
            questionText: "How is your general cardiovascular fitness? (1=poor endurance, 10=excellent cardiovascular health)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
        {
          code: "b710",
          domain: "Mobility of Joint Functions",
          indicator: "Range of Motion (Uninvolved joints)",
          unit: "1-10 scale",
          range: 10,
          justification: "Baseline overall joint mobility for comparison post-op.",
          question: {
            questionText: "How would you describe your overall joint flexibility? (1=very stiff, 10=very flexible)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
        {
          code: "b820",
          domain: "Proprioceptive Functions",
          indicator: "Balance & Proprioception",
          unit: "1-10 scale",
          range: 10,
          justification: "Critical for fall risk and rehabilitation progression.",
          question: {
            questionText: "How is your balance and coordination? (1=poor balance, 10=excellent balance)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
      ],
      summary: "Systemic homeostasis: Pre-operative baseline for cardiovascular fitness, joint mobility, and proprioception. All systems in healthy pre-operative state.",
    },
  },
};

/**
 * Template for Hip Replacement patients
 */
export const HIP_QUERY_BASELINE: QueryBaseline = {
  axes: {
    biomechanical: {
      axisType: "A",
      entries: [
        {
          code: "s750",
          domain: "Structure of Lower Extremity (Hip Joint)",
          indicator: "Hip Joint Integrity",
          unit: "1-10 scale",
          range: 10,
          justification: "Core indicator for prosthetic integration and stability.",
          question: {
            questionText: "How stable and pain-free is your hip joint right now? (1=unstable/severe pain, 10=completely stable/pain-free)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
        {
          code: "b280",
          domain: "Pain",
          indicator: "Hip/Groin Pain",
          unit: "1-10 scale",
          range: 10,
          justification: "Primary limiting factor for functional recovery.",
          question: {
            questionText: "Rate your hip and groin pain. (1=severe, 10=no pain)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
        {
          code: "b620",
          domain: "Urinary Functions",
          indicator: "Catheter Status & Bladder Function",
          unit: "1-10 scale",
          range: 10,
          justification: "Post-op urinary retention is common; needs baseline assessment.",
          question: {
            questionText: "Are you experiencing any urinary concerns? (1=unable to void, 10=completely normal)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
      ],
      summary: "Biomechanical: Pre-operative baseline for hip joint structure and arthritic changes. Expected to show significant improvement post-op.",
    },
    functional: {
      axisType: "B",
      entries: [
        {
          code: "d450",
          domain: "Walking",
          indicator: "Walking Distance & Assistive Devices",
          unit: "meters",
          range: 1000,
          justification: "Primary marker of hip replacement success.",
          question: {
            questionText: "How far can you currently walk? Do you use a cane or walker? (describe distance and aids used)",
            inputType: "text",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 1000,
            },
          },
        },
        {
          code: "d455",
          domain: "Moving Around",
          indicator: "Stairs & Transitions",
          unit: "1-10 scale",
          range: 10,
          justification: "Key indicator of hip ROM restrictions and fall risk.",
          question: {
            questionText: "Can you climb stairs or get in/out of a car? (1=cannot do, 10=completely independent)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
        {
          code: "d630",
          domain: "Preparing Meals",
          indicator: "Standing Tolerance & Kitchen Work",
          unit: "minutes",
          range: 120,
          justification: "Predicts discharge timeline and independence.",
          question: {
            questionText: "How long can you stand or work in the kitchen before needing to sit? (estimate in minutes)",
            inputType: "text",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 120,
            },
          },
        },
      ],
      summary: "Functional capacity: Pre-operative baseline for elderly hip replacement patient. Expect significant functional gains post-op.",
    },
    systemic: {
      axisType: "C",
      entries: [
        {
          code: "b410",
          domain: "Cardiovascular Functions",
          indicator: "Cardiac Comorbidities & Exercise Tolerance",
          unit: "1-10 scale",
          range: 10,
          justification: "Critical for elderly patients with likely cardiac history.",
          question: {
            questionText: "Do you have any cardiac conditions? Rate your exercise tolerance. (1=severe restrictions, 10=good tolerance)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
        {
          code: "b510",
          domain: "Ingestion Functions",
          indicator: "Nutritional Status",
          unit: "1-10 scale",
          range: 10,
          justification: "Elderly patients prone to malnutrition; critical for bone healing.",
          question: {
            questionText: "How is your appetite and nutritional intake? (1=poor, 10=excellent)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
        {
          code: "b530",
          domain: "Digestive Functions",
          indicator: "Bowel Regularity & GI Tolerance",
          unit: "1-10 scale",
          range: 10,
          justification: "Pain meds often cause constipation; baseline needed.",
          question: {
            questionText: "Are you experiencing any digestive or bowel concerns? (1=constipation or diarrhea, 10=completely normal)",
            inputType: "slider",
            metadata: {
              intent: "baseline",
              sliderMin: 0,
              sliderMax: 10,
            },
          },
        },
      ],
      summary: "Systemic homeostasis: Pre-operative baseline for elderly patient with focus on cardiac, nutritional, and GI status. Multiple comorbidities likely.",
    },
  },
};
