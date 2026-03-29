import { Baseline } from "@/lib/user/baseline";

/**
 * Default Baseline template for colostomy patients.
 * This replaces LLM-generated assessment during dev/test.
 * Values are pre-op baseline (qualifier 0-1, mid-range values).
 */
export const COLOSTOMY_BASELINE: Baseline = {
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
          value: 9,
          qualifier: 0,
          assessment:
            "Patient reports 9/10 surgical site integrity with minimal discomfort. Pre-operative abdominal wall assessment indicates excellent condition with no signs of hernia or tissue compromise. Qualifier 0 (no problem) reflects optimal pre-surgical state.",
        },
        {
          code: "b525",
          domain: "Defecation Functions",
          indicator: "Stoma Output & Consistency",
          unit: "1-10 scale",
          range: 10,
          value: 8,
          qualifier: 1,
          assessment:
            "Patient anticipates colostomy management post-operatively. Pre-operative baseline indicates mild concern (qualifier 1) regarding adaptation to stoma care, though physiologically prepared. Expected improvement with education.",
        },
        {
          code: "b280",
          domain: "Pain",
          indicator: "Post-Operative Pain Level",
          unit: "1-10 scale",
          range: 10,
          value: 9,
          qualifier: 0,
          assessment:
            "Patient reports minimal baseline pain (9/10 pain-free status). No acute surgical site discomfort. Qualifier 0 reflects excellent pre-operative analgesia baseline and pain management readiness.",
        },
      ],
      summary:
        "Biomechanical Axis (A): Pre-operative baseline indicates excellent abdominal wall integrity, normal pain function, and satisfactory stoma-related preparation. Qualifiers range 0-1 (no to mild problems), reflecting optimal pre-operative state. Expected trajectory: stable to improving with post-operative wound healing.",
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
          value: 500,
          qualifier: 0,
          assessment:
            "Patient walks approximately 500 meters comfortably without assistive devices. Full independence in ambulation with no restrictions. Qualifier 0 indicates normal functional capacity for walking.",
        },
        {
          code: "d530",
          domain: "Toileting",
          indicator: "Independence in Toilet/Stoma Care",
          unit: "1-10 scale",
          range: 10,
          value: 8,
          qualifier: 1,
          assessment:
            "Patient demonstrates 8/10 independence in personal hygiene and bowel care pre-operatively. Mild qualifier (1) relates to anticipated learning curve for stoma management post-op. Cognitive and motor capacity fully intact.",
        },
        {
          code: "d540",
          domain: "Dressing",
          indicator: "Self-Care Ability",
          unit: "1-10 scale",
          range: 10,
          value: 9,
          qualifier: 0,
          assessment:
            "Patient reports 9/10 independence in dressing and self-grooming. Upper extremity strength and coordination fully intact. Qualifier 0 reflects normal pre-operative functional status.",
        },
      ],
      summary:
        "Functional Capacity Axis (B): Pre-operative baseline demonstrates excellent ambulation, near-complete independence in self-care, and strong readiness for post-operative mobility goals. Qualifiers mostly 0 with one mild (1) qualifier for stoma care adaptation. Expected trajectory: functional gains as patient adapts to colostomy.",
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
          value: 8,
          qualifier: 0,
          assessment:
            "Patient rates exercise tolerance at 8/10 with no cardiovascular red flags. Pre-operative cardiac assessment satisfactory. Qualifier 0 indicates stable systemic homeostasis and clearance for post-operative rehabilitation.",
        },
        {
          code: "b510",
          domain: "Ingestion Functions",
          indicator: "Dietary Intake & Tolerance",
          unit: "1-10 scale",
          range: 10,
          value: 8,
          qualifier: 0,
          assessment:
            "Patient demonstrates excellent oral intake tolerance (8/10) with normal appetite. Nutritional baseline solid for wound healing post-operatively. No dysphagia or GI intolerance reported. Qualifier 0 reflects optimal nutritional homeostasis.",
        },
        {
          code: "b620",
          domain: "Urinary Functions",
          indicator: "Continence & Urinary Output",
          unit: "1-10 scale",
          range: 10,
          value: 9,
          qualifier: 0,
          assessment:
            "Patient reports 9/10 urinary continence and normal urinary function. No incontinence, urgency, or voiding difficulties. Qualifier 0 indicates stable genitourinary function as baseline.",
        },
      ],
      summary:
        "Systemic Homeostasis Axis (C): Pre-operative baseline reflects excellent cardiovascular tolerance, strong nutritional status, and normal genitourinary function. All qualifiers are 0 (no problems), indicating optimal systemic homeostasis for post-operative recovery. Expected trajectory: maintained stability with appropriate post-operative management.",
    },
  },
};

/**
 * Baseline template for ACL Reconstruction patients
 */
export const ACL_BASELINE: Baseline = {
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
          value: 5,
          qualifier: 1,
          assessment:
            "Patient reports moderate pre-operative knee instability (5/10) due to ACL tear. Mild swelling present. Qualifier 1 reflects anticipated structural impairment that surgery will address. Root pathology: ACL insufficiency.",
        },
        {
          code: "b280",
          domain: "Pain",
          indicator: "Localized Knee Pain",
          unit: "1-10 scale",
          range: 10,
          value: 6,
          qualifier: 1,
          assessment:
            "Patient rates pre-operative knee pain at 6/10, consistent with ACL tear and activity restriction. Pain fluctuates with activity level. Qualifier 1 (mild problem) reflects pain limitation without severe disability.",
        },
        {
          code: "b770",
          domain: "Gait Functions",
          indicator: "Gait Pattern & Weight-Bearing",
          unit: "1-10 scale",
          range: 10,
          value: 6,
          qualifier: 1,
          assessment:
            "Patient demonstrates 6/10 normalcy in gait pattern. Antalgic gait present; able to fully weight-bear on affected side. Qualifier 1 indicates mild gait deviation due to pain and instability. Motor innervation intact.",
        },
      ],
      summary:
        "Biomechanical Axis (A): Pre-operative baseline shows expected ACL tear pathology with moderate structural impairment, mild-to-moderate pain, and compensatory gait pattern. Qualifiers 1 (mild problems) reflect reversible soft-tissue injury pattern. Expected trajectory: significant improvement post-graft incorporation.",
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
          value: 2000,
          qualifier: 1,
          assessment:
            "Patient ambulates 2000 meters at reduced speed and with pain management. Functional but limited by pain and instability. Qualifier 1 reflects activity restriction secondary to ACL injury rather than absolute disability.",
        },
        {
          code: "d455",
          domain: "Moving Around",
          indicator: "Stairs & Inclines",
          unit: "1-10 scale",
          range: 10,
          value: 5,
          qualifier: 2,
          assessment:
            "Patient rates stair climbing at 5/10 with significant difficulty and pain especially descending. Knee buckles occasionally. Qualifier 2 (moderate problem) reflects functional limitation in multi-directional movements.",
        },
        {
          code: "d760",
          domain: "Family Relationships",
          indicator: "Sports/Recreation Participation",
          unit: "1-10 scale",
          range: 10,
          value: 2,
          qualifier: 3,
          assessment:
            "Patient reports near-complete inability to participate in pre-injury sports (2/10 activity level). Significant lifestyle alteration. Qualifier 3 (severe problem) reflects substantial functional loss motivating surgical intervention.",
        },
      ],
      summary:
        "Functional Capacity Axis (B): Pre-operative baseline reflects significant functional limitation in high-demand activities due to ACL insufficiency. Walking reduced, multi-directional movement compromised, sports participation essentially eliminated. Qualifiers 1-3 indicate mild-to-severe functional impairment. Expected trajectory: dramatic functional gains post-graft stabilization and rehabilitation.",
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
          value: 7,
          qualifier: 0,
          assessment:
            "Young athletic patient reports 7/10 pre-operative cardiovascular fitness despite activity modification due to injury. Cardiac clearance excellent. Qualifier 0 reflects robust systemic reserve for rehabilitation.",
        },
        {
          code: "b710",
          domain: "Mobility of Joint Functions",
          indicator: "Range of Motion (Uninvolved joints)",
          unit: "1-10 scale",
          range: 10,
          value: 8,
          qualifier: 0,
          assessment:
            "Patient demonstrates 8/10 overall joint flexibility. Contralateral knee, hips, and ankles show normal ROM. Qualifier 0 indicates preserved joint mobility unaffected by ACL injury.",
        },
        {
          code: "b820",
          domain: "Proprioceptive Functions",
          indicator: "Balance & Proprioception",
          unit: "1-10 scale",
          range: 10,
          value: 5,
          qualifier: 1,
          assessment:
            "Patient reports 5/10 balance security; single-leg stance difficult on affected side. Proprioceptive deficit secondary to ACL mechanoreceptor loss. Qualifier 1 reflects injury-related proprioceptive impairment. Motor control otherwise intact.",
        },
      ],
      summary:
        "Systemic Homeostasis Axis (C): Pre-operative baseline reflects healthy young athletic patient with excellent cardiovascular fitness and preserved joint mobility. Isolated proprioceptive deficit (qualifier 1) due to ACL insufficiency. Overall systemic status optimal for surgical and post-operative demands.",
    },
  },
};

/**
 * Baseline template for Hip Replacement patients
 */
export const HIP_BASELINE: Baseline = {
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
          value: 3,
          qualifier: 3,
          assessment:
            "Elderly patient reports severely compromised hip joint (3/10) with advanced osteoarthritis. Significant cartilage loss and osteophyte formation evident on imaging. Qualifier 3 (severe problem) reflects severe structural degeneration necessitating surgical intervention.",
        },
        {
          code: "b280",
          domain: "Pain",
          indicator: "Hip/Groin Pain",
          unit: "1-10 scale",
          range: 10,
          value: 3,
          qualifier: 3,
          assessment:
            "Patient rates hip and groin pain at 3/10 (severe on patient's 1-10 scale). Pain constant, limiting all functional activities. Night pain disrupting sleep. Qualifier 3 reflects severe pain impacting quality of life and function.",
        },
        {
          code: "b620",
          domain: "Urinary Functions",
          indicator: "Catheter Status & Bladder Function",
          unit: "1-10 scale",
          range: 10,
          value: 7,
          qualifier: 1,
          assessment:
            "Elderly patient reports mild urinary hesitancy and nocturia consistent with age-related changes and opioid use. No acute retention. Qualifier 1 reflects mild age-usual genitourinary changes, not post-surgical complications.",
        },
      ],
      summary:
        "Biomechanical Axis (A): Pre-operative baseline reflects advanced osteoarthritic changes in hip joint with severe pain and structural compromise. This is the pathology indication for hip replacement. Qualifiers 3 (hip joint) and 3 (pain) indicate severe pre-operative impairment. Expected trajectory: marked improvement post-prosthetic placement.",
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
          value: 200,
          qualifier: 3,
          assessment:
            "Elderly patient walks only 200 meters with single point cane and significant pain. Gait markedly antalgic; limited by hip symptoms not deconditioning. Qualifier 3 indicates severe functional limitation in primary mobility.",
        },
        {
          code: "d455",
          domain: "Moving Around",
          indicator: "Stairs & Transitions",
          unit: "1-10 scale",
          range: 10,
          value: 2,
          qualifier: 3,
          assessment:
            "Patient rates stair/transition ability at 2/10. Cannot climb stairs independently; requires railings and significant pain tolerance. Transfers in/out of vehicles extremely difficult. Qualifier 3 reflects severe restriction in multi-directional movement.",
        },
        {
          code: "d630",
          domain: "Preparing Meals",
          indicator: "Standing Tolerance & Kitchen Work",
          unit: "minutes",
          range: 120,
          value: 10,
          qualifier: 3,
          assessment:
            "Patient can stand in kitchen only ~10 minutes before severe pain forces return to seated position. Spouse preparing all meals. Qualifier 3 reflects severe functional limitation in ADL instrumental activities.",
        },
      ],
      summary:
        "Functional Capacity Axis (B): Pre-operative baseline reflects severe functional impairment characteristic of advanced hip OA. Profound limitation in ambulation, stair negotiation, and standing tolerance. All qualifiers 3 (severe problems). This represents the impact of failed conservative management. Expected trajectory: dramatic functional recovery post-total hip replacement.",
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
          value: 5,
          qualifier: 1,
          assessment:
            "Elderly patient with history of hypertension controlled on medications. Cardiac clearance obtained. Exercise tolerance limited by pain rather than cardiac function. Qualifier 1 reflects mild age-related cardiovascular reserve reduction, not acute concern.",
        },
        {
          code: "b510",
          domain: "Ingestion Functions",
          indicator: "Nutritional Status",
          unit: "1-10 scale",
          range: 10,
          value: 6,
          qualifier: 1,
          assessment:
            "Elderly patient reports reduced appetite (6/10) secondary to chronic pain and opioid effects. Nutritional intake adequate but suboptimal for post-operative bone healing. Qualifier 1 reflects mild nutritional concern requiring nutritional counseling.",
        },
        {
          code: "b530",
          domain: "Digestive Functions",
          indicator: "Bowel Regularity & GI Tolerance",
          unit: "1-10 scale",
          range: 10,
          value: 5,
          qualifier: 2,
          assessment:
            "Elderly patient experiencing opioid-induced constipation (5/10 bowel regularity). Taking stool softeners. History of diverticulosis without acute inflammation. Qualifier 2 reflects moderate GI concern requiring pre-operative optimization.",
        },
      ],
      summary:
        "Systemic Homeostasis Axis (C): Pre-operative baseline reflects elderly patient with typical age-related comorbidities (hypertension, reduced cardiovascular reserve, nutritional concerns, constipation) managed but present. Qualifiers 1-2 (mild-moderate problems). Medical optimization recommended pre-operatively. Expected trajectory: homeostasis maintained perioperatively with appropriate geriatric protocols.",
    },
  },
};
