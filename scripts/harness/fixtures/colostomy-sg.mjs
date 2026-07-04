// Mutation-scenario fixtures for the plan-distance suite (TODO 12.2).
//
// Each fixture is ONE colostomy patient persona whose PROFILE carries lifestyle features that
// should produce SEMANTIC MUTATIONS to the plan — and scripted EVENTS where the patient tells
// Wally about their day BEFORE that day's plan generates. The system should ADAPT the plan
// (that's the agentic promise) while the plan-distance metric keeps the adaptation within the
// clinician anchor's intent (that's the regularization promise). We hold no hard prior on D
// values — the suite reports the distance trajectory and where it moved on event days.
//
// Scenarios are contextualized to Singapore: kopitiam breakfasts, hawker-centre dinners,
// wet-market mornings, HDB lift maintenance, polyclinic follow-ups, haze days.

export const COLOSTOMY_SG_FIXTURES = [
    {
        name: "kopitiam-uncle",
        blurb: "kopitiam regular — diet mutations on social breakfasts",
        policy:
            "You are a 58-year-old Singaporean uncle recovering from colostomy surgery. You are " +
            "sociable and food-loving: most mornings you meet your kakis (old friends) at the " +
            "kopitiam downstairs for kopi and kaya toast, and you find the hospital diet plan " +
            "bland. You follow the exercise plan fairly well (~75-85%) because your wife nags " +
            "you, and your pain slowly improves from 5 toward 3. On days you visit the kopitiam " +
            "you eat out rather than following the meal plan exactly.",
        events: [
            {
                day: 2,
                message:
                    "Morning! Going down to the kopitiam to meet my kakis for breakfast — probably " +
                    "having kaya toast, soft boiled eggs and kopi-c. Can you adjust my food plan for today?",
            },
            {
                day: 4,
                message:
                    "My daughter is bringing the grandkids over for dinner tonight, we're ordering zi char " +
                    "— sweet and sour pork, cereal prawns, the works. What should I watch out for with my stoma?",
            },
        ],
        expect: "nutrition adapts on days 2 & 4 (S/N may tick up) while D stays under the flag threshold",
    },
    {
        name: "wet-market-auntie",
        blurb: "morning wet-market walker — exercise substitutions",
        policy:
            "You are a 62-year-old Singaporean auntie recovering from colostomy surgery. You are " +
            "disciplined with food (~90% of the nutrition plan) but you dislike 'exercise for " +
            "exercise's sake' — you prefer getting your movement from real errands: walking to " +
            "the wet market in the morning, cooking, mopping the flat. Pain improves steadily " +
            "from 5 toward 2. When the plan prescribes indoor exercises you often substitute " +
            "them with your errand-walking and say so.",
        events: [
            {
                day: 2,
                message:
                    "I'm walking to the wet market at Ghim Moh this morning to buy fish and vegetables — " +
                    "about 20 minutes each way plus carrying groceries. Can that count as my exercise today?",
            },
            {
                day: 4,
                message:
                    "Lift upgrading works in my block this week! I had to climb 4 floors with my marketing " +
                    "bags today. Quite tiring — should I still do the rest of the exercises?",
            },
        ],
        expect: "exercise adapts/substitutes (composition may shift on event days) within the anchor's intent",
    },
    {
        name: "polyclinic-haze",
        blurb: "clinic follow-up + haze day — plan lightening",
        policy:
            "You are a 55-year-old Singaporean man recovering from colostomy surgery, generally " +
            "compliant (~80%) and a bit anxious about your recovery. You check the PSI reading " +
            "every morning and worry about the haze. Your pain improves slowly from 5 toward 4. " +
            "You have a polyclinic follow-up mid-week and get tired on appointment days.",
        events: [
            {
                day: 2,
                message:
                    "PSI is 152 today, haze is quite bad. I don't want to do my walk outside — " +
                    "can you give me something to do indoors instead?",
            },
            {
                day: 3,
                message:
                    "I have my follow-up at the polyclinic this afternoon — taking the MRT there and back, " +
                    "probably a lot of waiting around. Can we keep today's plan light?",
            },
        ],
        expect: "same-category substitutions (aerobic indoor swap) + a lighter clinic day, numeric axis staying in-band",
    },
];
