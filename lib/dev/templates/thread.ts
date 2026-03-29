import { BaseMessage } from "@/lib/external/schemas/message";

/**
 * Default onboarding thread template for colostomy patients.
 * 5 Q&A pairs covering environment, support, lifestyle, diet, and psychology.
 */
export const COLOSTOMY_THREAD_MESSAGES: BaseMessage[] = [
  // Question 1: Home environment
  {
    role: "assistant",
    content:
      "Looking at your home setup—how would you describe your living situation? Any stairs, elevator, or accessibility barriers we should know about?",
    creationSource: "dev-seeding",
    context: {
      inputType: "text",
      options: [],
      metadata: {
        intent: "environment",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 4000),
  },
  {
    role: "user",
    content:
      "Single-story HDB flat, no stairs. Bathroom renovated for elderly parents—grab bars installed, spacious shower.",
    creationSource: "dev-seeding",
    context: null,
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3900),
  },

  // Question 2: Social support
  {
    role: "assistant",
    content:
      "Who will be helping you at home during the first few weeks of recovery? Will anyone be around during the day?",
    creationSource: "dev-seeding",
    context: {
      inputType: "text",
      options: [],
      metadata: {
        intent: "social_support",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3800),
  },
  {
    role: "user",
    content:
      "My wife will be taking medical leave for the first 2 weeks. She's a nurse, so she understands post-op care. My daughter can visit on weekends if needed.",
    creationSource: "dev-seeding",
    context: null,
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3700),
  },

  // Question 3: Diet and lifestyle
  {
    role: "assistant",
    content:
      "When it comes to eating, do you have any dietary preferences or restrictions? Asian diet, vegetarian, any foods you avoid?",
    creationSource: "dev-seeding",
    context: {
      inputType: "text",
      options: [],
      metadata: {
        intent: "lifestyle",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3600),
  },
  {
    role: "user",
    content:
      "Standard Asian diet—we cook mostly at home. No restrictions, but my wife prefers avoiding too much spice for my recovery.",
    creationSource: "dev-seeding",
    context: null,
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3500),
  },

  // Question 4: Work and activity level
  {
    role: "assistant",
    content:
      "Before surgery, what's a typical day like for you? Do you work, and if so, is it desk work or more physically active?",
    creationSource: "dev-seeding",
    context: {
      inputType: "text",
      options: [],
      metadata: {
        intent: "activity",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3400),
  },
  {
    role: "user",
    content:
      "I'm semi-retired; mostly desk work but I enjoy gardening on weekends. Light activities around the house.",
    creationSource: "dev-seeding",
    context: null,
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3300),
  },

  // Question 5: Anxiety and expectations
  {
    role: "assistant",
    content:
      "Finally, how are you feeling emotionally about the surgery and recovery? Any particular worries or concerns?",
    creationSource: "dev-seeding",
    context: {
      inputType: "text",
      options: [],
      metadata: {
        intent: "psychology",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3200),
  },
  {
    role: "user",
    content:
      "A bit nervous about managing the stoma at first, but my wife's nursing background is reassuring. Hopeful this will improve my quality of life.",
    creationSource: "dev-seeding",
    context: null,
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3100),
  },

  // Termination signal
  {
    role: "assistant",
    content:
      "Thank you for sharing all this information. We have a good understanding of your home, support system, and recovery goals. Let's move forward with creating your personalized recovery plan.",
    creationSource: "dev-seeding",
    context: {
      inputType: "terminateQuestioning",
      options: [],
      metadata: {
        intent: "completion",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3000),
  },
];

/**
 * Onboarding thread template for ACL Reconstruction patients
 */
export const ACL_THREAD_MESSAGES: BaseMessage[] = [
  // Question 1: Injury context
  {
    role: "assistant",
    content:
      "Tell me about your injury—how did it happen, and how long ago? Were you playing a sport when it occurred?",
    creationSource: "dev-seeding",
    context: {
      inputType: "text",
      options: [],
      metadata: {
        intent: "injury_context",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 4000),
  },
  {
    role: "user",
    content:
      "Tore my ACL 6 months ago playing soccer. Been managing with a brace, but it's unstable and stopping me from returning to sport.",
    creationSource: "dev-seeding",
    context: null,
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3900),
  },

  // Question 2: Current limitations
  {
    role: "assistant",
    content:
      "What activities are you currently avoiding or having trouble with? Walk, stairs, sports, anything else?",
    creationSource: "dev-seeding",
    context: {
      inputType: "text",
      options: [],
      metadata: {
        intent: "limitations",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3800),
  },
  {
    role: "user",
    content:
      "Can't play soccer, basketball, or cut/pivot movements. Walking is okay, stairs are tough descending. Afraid of the knee giving out.",
    creationSource: "dev-seeding",
    context: null,
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3700),
  },

  // Question 3: Work/school
  {
    role: "assistant",
    content:
      "Are you currently working or studying? If so, what does a typical day look like, and how is the injury affecting your routine?",
    creationSource: "dev-seeding",
    context: {
      inputType: "text",
      options: [],
      metadata: {
        intent: "work",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3600),
  },
  {
    role: "user",
    content:
      "Software engineer, mostly desk work. I can manage my job fine. But I'm frustrated I can't get to the gym or play rec sports with colleagues afterwork.",
    creationSource: "dev-seeding",
    context: null,
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3500),
  },

  // Question 4: Home situation
  {
    role: "assistant",
    content:
      "How do you feel about your living situation for recovery? Do you have stairs, and who can help with daily tasks if needed?",
    creationSource: "dev-seeding",
    context: {
      inputType: "text",
      options: [],
      metadata: {
        intent: "home",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3400),
  },
  {
    role: "user",
    content:
      "Apartment with stairs, but my roommate will be around the first week. I can work from home if I need to take it easy.",
    creationSource: "dev-seeding",
    context: null,
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3300),
  },

  // Question 5: Recovery goals
  {
    role: "assistant",
    content:
      "What are your top goals for after recovery? Do you want to get back to the same sport, or are you happy with general fitness?",
    creationSource: "dev-seeding",
    context: {
      inputType: "text",
      options: [],
      metadata: {
        intent: "goals",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3200),
  },
  {
    role: "user",
    content:
      "I want to get back to competitive soccer within a year. I've been dreaming about it the whole 6 months with the brace.",
    creationSource: "dev-seeding",
    context: null,
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3100),
  },

  // Termination signal
  {
    role: "assistant",
    content:
      "Excellent—your motivation and home support are great drivers for recovery. We'll build a plan to get you back to competitive play safely.",
    creationSource: "dev-seeding",
    context: {
      inputType: "terminateQuestioning",
      options: [],
      metadata: {
        intent: "completion",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3000),
  },
];

/**
 * Onboarding thread template for Hip Replacement patients
 */
export const HIP_THREAD_MESSAGES: BaseMessage[] = [
  // Question 1: Duration of symptoms
  {
    role: "assistant",
    content:
      "How long have you been dealing with hip pain and arthritis? Has it been getting progressively worse?",
    creationSource: "dev-seeding",
    context: {
      inputType: "text",
      options: [],
      metadata: {
        intent: "symptom_duration",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 4000),
  },
  {
    role: "user",
    content:
      "About 5 years of progressive pain. Tried physical therapy, injections, everything. Pain is now affecting my sleep and daily life.",
    creationSource: "dev-seeding",
    context: null,
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3900),
  },

  // Question 2: Current pain and function
  {
    role: "assistant",
    content:
      "Right now, what activities can you do without significant pain? Can you walk to the mailbox, use stairs, get out of a car?",
    creationSource: "dev-seeding",
    context: {
      inputType: "text",
      options: [],
      metadata: {
        intent: "current_function",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3800),
  },
  {
    role: "user",
    content:
      "Walking is very limited—maybe 100-200 meters before pain forces me to sit. Stairs are extremely difficult. Getting in/out of a car is painful.",
    creationSource: "dev-seeding",
    context: null,
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3700),
  },

  // Question 3: Medications and sleep
  {
    role: "assistant",
    content:
      "Are you taking pain medications? How is your sleep—is the hip pain waking you up at night?",
    creationSource: "dev-seeding",
    context: {
      inputType: "text",
      options: [],
      metadata: {
        intent: "medications_sleep",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3600),
  },
  {
    role: "user",
    content:
      "Taking ibuprofen daily, sometimes acetaminophen at night. Sleep is terrible—I wake up 3-4 times a night with hip pain.",
    creationSource: "dev-seeding",
    context: null,
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3500),
  },

  // Question 4: Family and home support
  {
    role: "assistant",
    content:
      "Who lives with you, or who can help after surgery? Do you have family nearby who can assist with meals or care?",
    creationSource: "dev-seeding",
    context: {
      inputType: "text",
      options: [],
      metadata: {
        intent: "family_support",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3400),
  },
  {
    role: "user",
    content:
      "My husband is retired and will be here full-time. My daughter lives next door and can help if needed. We're well-prepared.",
    creationSource: "dev-seeding",
    context: null,
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3300),
  },

  // Question 5: Expectations and concerns
  {
    role: "assistant",
    content:
      "What are your biggest hopes for after the surgery? Any concerns—like fear of complications or taking too long to recover?",
    creationSource: "dev-seeding",
    context: {
      inputType: "text",
      options: [],
      metadata: {
        intent: "expectations",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3200),
  },
  {
    role: "user",
    content:
      "I just want my life back—to walk without pain, sleep at night, maybe travel again. I'm nervous about surgery at my age, but more nervous about continuing like this.",
    creationSource: "dev-seeding",
    context: null,
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3100),
  },

  // Termination signal
  {
    role: "assistant",
    content:
      "Your goals are realistic, and your support system is excellent. Many patients your age recover beautifully. Let's create a recovery plan focused on restoring your independence and quality of life.",
    creationSource: "dev-seeding",
    context: {
      inputType: "terminateQuestioning",
      options: [],
      metadata: {
        intent: "completion",
        urgency: false,
        sliderMin: 0,
        sliderMax: 10,
      },
    },
    threadId: null,
    reasoning: null,
    createdAt: new Date(Date.now() - 3000),
  },
];
